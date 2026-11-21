#!/usr/bin/env python3
"""Neon-ball visual tracker: real pixels -> detector -> 6D Kalman -> future prediction.

No access to the webpage's JavaScript ball state is used.
"""
from __future__ import annotations

import argparse
import csv
from collections import deque
from dataclasses import dataclass
from pathlib import Path
import math
import time

import cv2
import numpy as np


@dataclass
class Detection:
    x: float
    y: float
    radius: float
    score: float
    source: str


class VisualBallDetector:
    """Finds the spherical leading head, not its thin luminous trail.

    This image-processing baseline also provides a fallback if a trained YOLO
    model has not yet been produced. It is NOT a neural-network detector.
    """

    def __init__(self):
        self.open3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        self.open7 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))

    def detect_all(self, frame: np.ndarray) -> list[Detection]:
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        bright_white = cv2.inRange(frame, (218, 218, 218), (255, 255, 255))
        bright_white = cv2.morphologyEx(bright_white, cv2.MORPH_OPEN, self.open3)
        # Coloured ball shell: very saturated and bright. Morphological opening
        # removes the narrow comet line while preserving the much larger disk.
        chroma = cv2.inRange(hsv, (0, 70, 156), (179, 255, 255))
        chroma = cv2.morphologyEx(chroma, cv2.MORPH_OPEN, self.open7)
        candidates = []
        for mask, source in [(chroma, 'color'), (bright_white, 'core')]:
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area < (70 if source == 'color' else 13) or area > 4500:
                    continue
                perimeter = cv2.arcLength(cnt, True)
                if perimeter < 1:
                    continue
                circularity = 4.0 * math.pi * area / (perimeter * perimeter)
                if circularity < (0.37 if source == 'color' else 0.32):
                    continue
                (cx, cy), r = cv2.minEnclosingCircle(cnt)
                if not (2.0 <= r <= 65.0):
                    continue
                # A sphere should have its glow/saturated shell around the core.
                # Disk support helps suppress HUD letters and isolated trail points.
                y1, y2 = max(0, int(cy-26)), min(frame.shape[0], int(cy+27))
                x1, x2 = max(0, int(cx-26)), min(frame.shape[1], int(cx+27))
                patch = hsv[y1:y2, x1:x2]
                if patch.size == 0:
                    continue
                saturation_support = float(np.count_nonzero((patch[:, :, 1] > 75) &
                                                           (patch[:, :, 2] > 125)))
                if saturation_support < 20:
                    continue
                score = min(1., circularity) * .62 + min(1., saturation_support / 230) * .38
                if source == 'color':
                    score += .12
                candidates.append(Detection(float(cx), float(cy), max(float(r), 9.),
                                            float(score), 'classical'))
        # Non-maximum suppression: merge color shell and white core of same ball.
        candidates.sort(key=lambda d: d.score, reverse=True)
        deduped: list[Detection] = []
        for d in candidates:
            if any(math.hypot(d.x - kept.x, d.y - kept.y) < 25 for kept in deduped):
                continue
            deduped.append(d)
        return deduped[:24]


class YoloBallDetector:
    """Trained one-class YOLO detector; no COCO sports-ball shortcut."""

    def __init__(self, weights: Path, imgsz: int = 960, conf: float = .18):
        from ultralytics import YOLO
        self.model = YOLO(str(weights))
        self.imgsz = imgsz
        self.conf = conf

    def detect_all(self, frame: np.ndarray) -> list[Detection]:
        result = self.model.predict(frame, imgsz=self.imgsz, conf=self.conf,
                                    verbose=False)[0]
        if result.boxes is None:
            return []
        candidates = []
        for xyxy, conf, cls in zip(result.boxes.xyxy.cpu().numpy(),
                                   result.boxes.conf.cpu().numpy(),
                                   result.boxes.cls.cpu().numpy()):
            if int(cls) != 0:
                continue
            x1, y1, x2, y2 = map(float, xyxy)
            candidates.append(Detection((x1+x2)/2, (y1+y2)/2,
                                        (x2-x1+y2-y1)/4, float(conf), 'yolo'))
        return candidates


class AccelerationKalman:
    """Continuous white-jerk, 6-state Kalman filter: [x,y,vx,vy,ax,ay]."""

    def __init__(self, measurement_sigma: float = 7., jerk_intensity: float = 1.5e6):
        self.x = np.zeros((6, 1), np.float64)
        self.P = np.eye(6, dtype=np.float64) * 1000.
        self.H = np.zeros((2, 6), np.float64)
        self.H[0, 0] = self.H[1, 1] = 1.
        self.R = np.eye(2, dtype=np.float64) * measurement_sigma**2
        self.jerk_intensity = jerk_intensity
        self.ready = False

    @staticmethod
    def transition(dt: float) -> np.ndarray:
        F = np.eye(6)
        F[0, 2] = F[1, 3] = dt
        F[0, 4] = F[1, 5] = .5 * dt**2
        F[2, 4] = F[3, 5] = dt
        return F

    def reset(self, x: float, y: float) -> None:
        self.x[:] = 0.
        self.x[0, 0] = x
        self.x[1, 0] = y
        self.P = np.diag([100., 100., 250000., 250000., 300000., 300000.]).astype(float)
        self.ready = True

    def predict(self, dt: float) -> None:
        if not self.ready:
            return
        dt = float(np.clip(dt, .003, .4))
        F = self.transition(dt)
        # Exact process covariance for integrated continuous-time white jerk.
        q3 = np.array([[dt**5/20, dt**4/8, dt**3/6],
                       [dt**4/8, dt**3/3, dt**2/2],
                       [dt**3/6, dt**2/2, dt]], dtype=float)
        Q = np.zeros((6, 6), dtype=float)
        for ij in [(0, 2, 4), (1, 3, 5)]:
            Q[np.ix_(ij, ij)] = q3 * self.jerk_intensity
        self.x = F @ self.x
        self.P = F @ self.P @ F.T + Q
        self.P = (self.P + self.P.T) * .5

    def distance_sq(self, det: Detection) -> float:
        if not self.ready:
            return 0.
        z = np.array([[det.x], [det.y]], dtype=float)
        innovation = z - self.H @ self.x
        S = self.H @ self.P @ self.H.T + self.R
        return float((innovation.T @ np.linalg.solve(S, innovation))[0, 0])

    def correct(self, det: Detection) -> None:
        if not self.ready:
            self.reset(det.x, det.y)
            return
        z = np.array([[det.x], [det.y]], dtype=float)
        innovation = z - self.H @ self.x
        S = self.H @ self.P @ self.H.T + self.R
        K = self.P @ self.H.T @ np.linalg.inv(S)
        self.x += K @ innovation
        # Joseph covariance update keeps symmetry/positive semi-definiteness.
        A = np.eye(6) - K @ self.H
        self.P = A @ self.P @ A.T + K @ self.R @ K.T
        self.P = (self.P + self.P.T) * .5

    def future(self, seconds: float) -> tuple[float, float, np.ndarray]:
        f = self.transition(seconds)
        est = f @ self.x
        cov = f @ self.P @ f.T
        return float(est[0, 0]), float(est[1, 0]), cov[:2, :2]


def choose_detection(candidates: list[Detection], kf: AccelerationKalman,
                     lost_time: float) -> Detection | None:
    if not candidates:
        return None
    if not kf.ready or lost_time > 1.2:
        return max(candidates, key=lambda d: d.score)
    # 99.9% chi-square gating for 2D plus a little room for crazy motion.
    # Prefer nearby predictions rather than the bright white user-interface.
    gated = [(kf.distance_sq(c), c) for c in candidates]
    gated = [(dist, c) for dist, c in gated if dist < 24.]
    if not gated:
        return None
    return min(gated, key=lambda pair: pair[0] - 1.0*pair[1].score)[1]


class SyntheticScene:
    """Standalone synthetic test source (not actual webpage or YOLO labels)."""

    def __init__(self, width=1120, height=720):
        self.w, self.h = width, height
        self.rng = np.random.default_rng(81)
        self.x, self.y = width*.24, height*.44
        self.heading = -.4
        self.turn = .0
        self.target = 1.1
        self.speed, self.target_speed = 240., 240.
        self.t = 0.
        self.next_change = .7
        self.points = deque(maxlen=430)
        self.bg = np.zeros((height, width, 3), dtype=np.uint8)
        self.bg[:] = (30, 18, 7)
        for _ in range(140):
            x = int(self.rng.integers(width))
            y = int(self.rng.integers(height))
            cv2.circle(self.bg, (x, y), 1, (65, 64, 45), -1)

    def next(self, dt=.033) -> tuple[np.ndarray, tuple[float, float]]:
        self.t += dt
        if self.t > self.next_change:
            self.target = float(self.rng.uniform(-2.2, 2.2))
            self.target_speed = float(self.rng.uniform(135., 380.))
            self.next_change = self.t + float(self.rng.uniform(.55, 2.5))
        self.turn += float(np.clip(self.target-self.turn, -6*dt, 6*dt))
        self.speed += (self.target_speed-self.speed)*dt*.8
        self.heading += self.turn*dt
        self.x += math.cos(self.heading)*self.speed*dt
        self.y += math.sin(self.heading)*self.speed*dt
        if self.x < 32 or self.x > self.w-32:
            self.heading = math.pi-self.heading
            self.x = float(np.clip(self.x, 32, self.w-32))
        if self.y < 32 or self.y > self.h-32:
            self.heading = -self.heading
            self.y = float(np.clip(self.y, 32, self.h-32))
        self.points.append((int(self.x), int(self.y)))
        frame = self.bg.copy()
        hue = int((self.t//5*29 + 60) % 180)
        color = cv2.cvtColor(np.uint8([[[hue, 210, 250]]]), cv2.COLOR_HSV2BGR)[0, 0]
        color = tuple(map(int, color))
        pts = list(self.points)
        for i in range(1, len(pts)):
            weight = i/len(pts)
            if weight < .08:
                continue
            c = tuple(int(v*weight) for v in color)
            cv2.line(frame, pts[i-1], pts[i], c, max(1, int(weight*7)), cv2.LINE_AA)
        center = (int(self.x), int(self.y))
        cv2.circle(frame, center, 37, tuple(int(v*.18) for v in color), -1, cv2.LINE_AA)
        cv2.circle(frame, center, 23, color, -1, cv2.LINE_AA)
        cv2.circle(frame, (center[0]-6, center[1]-7), 9, (255,255,255), -1, cv2.LINE_AA)
        return frame, (self.x, self.y)


def draw_covariance(frame: np.ndarray, x: float, y: float, covariance: np.ndarray) -> None:
    vals, vecs = np.linalg.eigh(covariance)
    vals = np.maximum(vals, 0)
    if np.max(vals) > 90000:
        return
    major = int(np.clip(2*np.sqrt(vals[1]), 1, 180))
    minor = int(np.clip(2*np.sqrt(vals[0]), 1, 180))
    theta = math.degrees(math.atan2(vecs[1,1], vecs[0,1]))
    cv2.ellipse(frame, (int(x), int(y)), (major, minor), theta, 0, 360,
                (45, 165, 255), 1, cv2.LINE_AA)


def annotate(frame: np.ndarray, det: Detection | None, kalman: AccelerationKalman,
             trajectory: deque, future_time: float, fps: float, method: str,
             lost: float, error: float | None = None) -> np.ndarray:
    out = frame.copy()
    if len(trajectory) > 1:
        pts = np.array(trajectory, np.int32).reshape((-1, 1, 2))
        cv2.polylines(out, [pts], False, (95, 220, 75), 2, cv2.LINE_AA)
    if det is not None:
        p = (int(det.x), int(det.y))
        cv2.circle(out, p, max(9, int(det.radius)), (255, 220, 40), 2, cv2.LINE_AA)
        cv2.drawMarker(out, p, (255, 255, 255), cv2.MARKER_CROSS, 14, 1, cv2.LINE_AA)
    if kalman.ready:
        kx, ky = map(int, kalman.x[:2, 0])
        cv2.circle(out, (kx, ky), 8, (70, 240, 85), -1, cv2.LINE_AA)
        fx, fy, covariance = kalman.future(future_time)
        cv2.arrowedLine(out, (kx, ky), (int(fx), int(fy)), (40, 170, 255), 2,
                        cv2.LINE_AA, tipLength=.2)
        cv2.circle(out, (int(fx), int(fy)), 9, (40, 170, 255), 2, cv2.LINE_AA)
        draw_covariance(out, fx, fy, covariance)
    panel_width = min(670, out.shape[1])
    overlay = out.copy()
    cv2.rectangle(overlay, (0, 0), (panel_width, 99), (9, 20, 14), -1)
    cv2.addWeighted(overlay, .8, out, .2, 0, out)
    status = 'MEASURED' if det else 'PREDICTION ONLY'
    cv2.putText(out, f'Detector: {method}   Status: {status}   FPS: {fps:.1f}',
                (14, 29), cv2.FONT_HERSHEY_SIMPLEX, .58, (190, 255, 205), 2, cv2.LINE_AA)
    cv2.putText(out, f'Blue = observation  Green = Kalman  Orange = +{future_time:.2f}s',
                (14, 56), cv2.FONT_HERSHEY_SIMPLEX, .49, (195, 208, 214), 1, cv2.LINE_AA)
    txt = f'Unseen: {lost:.2f}s  SPACE pause | Q exit'
    if error is not None:
        txt += f'  Demo tracking error: {error:.1f}px'
    cv2.putText(out, txt, (14, 82), cv2.FONT_HERSHEY_SIMPLEX, .48,
                (140, 220, 235), 1, cv2.LINE_AA)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description='YOLO + Kalman visual tracker for neon ball')
    ap.add_argument('--source', choices=['screen', 'video', 'demo'], default='screen')
    ap.add_argument('--video', type=Path, help='Video path for --source video')
    ap.add_argument('--monitor', type=int, default=1, help='MSS monitor index; 1=first display')
    ap.add_argument('--region', help='Capture region LEFT,TOP,WIDTH,HEIGHT (screen mode)')
    ap.add_argument('--mode', choices=['hybrid', 'yolo', 'classical'], default='hybrid')
    ap.add_argument('--model', type=Path, default=Path('runs/ball_yolo/weights/best.pt'))
    ap.add_argument('--imgsz', type=int, default=960)
    ap.add_argument('--conf', type=float, default=.18)
    ap.add_argument('--future', type=float, default=.35, help='Seconds to extrapolate')
    ap.add_argument('--csv', type=Path, help='Write tracking measurements to CSV')
    ap.add_argument('--no-gui', action='store_true', help='Headless processing (tests/servers)')
    ap.add_argument('--frames', type=int, default=0, help='Stop after N frames, 0=unlimited')
    args = ap.parse_args()

    classical = VisualBallDetector()
    yolo = None
    if args.mode != 'classical' and args.model.exists():
        try:
            yolo = YoloBallDetector(args.model, args.imgsz, args.conf)
            print(f'[INFO] Loaded trained YOLO weights: {args.model}')
        except ImportError as exc:
            if args.mode == 'yolo':
                raise SystemExit('YOLO not installed: pip install ultralytics') from exc
            print(f'[WARN] No ultralytics installed: {exc}. Classical mode selected.')
    if args.mode == 'yolo' and yolo is None:
        raise SystemExit(f'Missing trained YOLO model: {args.model}\n'
                         'Run synth_data.py and train_yolo.py first, or --mode classical.')
    if args.mode == 'hybrid' and yolo is None:
        print('[INFO] No trained weights yet. Using classical optical detector (not YOLO).')

    sct = None
    cap = None
    scene = None
    region = None
    if args.source == 'screen':
        try:
            import mss
            sct = mss.mss()
            if not 1 <= args.monitor < len(sct.monitors):
                raise ValueError(f'Monitor {args.monitor} not found; use 1..{len(sct.monitors)-1}')
            region = sct.monitors[args.monitor].copy()
            if args.region:
                vals = [int(v.strip()) for v in args.region.split(',')]
                if len(vals) != 4 or vals[2] <= 0 or vals[3] <= 0:
                    raise ValueError('Region format: LEFT,TOP,WIDTH,HEIGHT')
                region = dict(zip(('left', 'top', 'width', 'height'), vals))
            print('[INFO] Capturing screen pixels from', region)
        except Exception as exc:
            raise SystemExit('Screen capture failed. Linux Wayland may block MSS/X11. '
                             'Try an Xorg session, or test with --source demo.\n'
                             f'Details: {exc}') from exc
    elif args.source == 'video':
        if args.video is None:
            ap.error('Required for --source video: --video /path/to/file.mp4')
        cap = cv2.VideoCapture(str(args.video))
        if not cap.isOpened():
            ap.error(f'Cannot open video: {args.video}')
    else:
        scene = SyntheticScene()

    csv_handle = None
    writer = None
    if args.csv:
        args.csv.parent.mkdir(parents=True, exist_ok=True)
        csv_handle = args.csv.open('w', encoding='utf-8', newline='')
        writer = csv.writer(csv_handle)
        writer.writerow(['time_s','detector','measurement_x','measurement_y',
                         'estimated_x','estimated_y','vx','vy','ax','ay',
                         'future_x','future_y','detection_score','demo_error_px'])

    kalman = AccelerationKalman()
    trajectory = deque(maxlen=380)
    count = 0
    lost = 0.
    t0 = time.perf_counter()
    previous = t0
    smoothed_fps = 0.
    paused = False
    errors = []
    try:
        while True:
            if paused and not args.no_gui:
                key = cv2.waitKey(40) & 0xff
                if key in (ord('q'), 27):
                    break
                if key == 32:
                    paused = False
                continue
            t = time.perf_counter()
            dt = max(.004, min(.3, t-previous))
            previous = t
            truth = None
            if scene is not None:
                dt = 1/30
                frame, truth = scene.next(dt)
            elif sct is not None:
                raw = np.asarray(sct.grab(region))
                frame = cv2.cvtColor(raw, cv2.COLOR_BGRA2BGR)
            else:
                ok, frame = cap.read()
                if not ok:
                    break
                fps_video = cap.get(cv2.CAP_PROP_FPS)
                dt = 1/max(fps_video, 1) if fps_video else dt

            kalman.predict(dt)
            candidates = []
            if yolo is not None:
                candidates = yolo.detect_all(frame)
            if args.mode != 'yolo':
                optical_candidates = classical.detect_all(frame)
                if args.mode == 'classical':
                    candidates = optical_candidates
                elif not candidates:
                    candidates = optical_candidates
            det = choose_detection(candidates, kalman, lost)
            if det is not None:
                if lost > 1.2 or not kalman.ready:
                    kalman.reset(det.x, det.y)
                else:
                    kalman.correct(det)
                lost = 0.
                trajectory.append((int(kalman.x[0, 0]), int(kalman.x[1, 0])))
            else:
                lost += dt
                if kalman.ready:
                    trajectory.append((int(kalman.x[0, 0]), int(kalman.x[1, 0])))
                if lost > 3:
                    kalman.ready = False
                    trajectory.clear()

            demo_error = None
            if truth is not None and kalman.ready:
                demo_error = math.hypot(kalman.x[0,0]-truth[0],kalman.x[1,0]-truth[1])
                errors.append(demo_error)
            count += 1
            real_dt = max(time.perf_counter()-t, .001)
            smoothed_fps = smoothed_fps*.9 + (.1/real_dt) if smoothed_fps else 1/real_dt
            if kalman.ready:
                future_x, future_y, _ = kalman.future(args.future)
            else:
                future_x = future_y = float('nan')
            if writer:
                state = kalman.x[:,0] if kalman.ready else [float('nan')]*6
                writer.writerow([round(time.perf_counter()-t0,3), det.source if det else 'missing',
                                 det.x if det else '', det.y if det else '', *state,
                                 future_x, future_y, det.score if det else '',
                                 demo_error if demo_error is not None else ''])
            if not args.no_gui:
                img = annotate(frame, det, kalman, trajectory, args.future,
                               smoothed_fps, det.source if det else ('YOLO' if yolo else 'classical'),
                               lost, demo_error)
                cv2.imshow('Neon Ball | YOLO + Kalman', img)
                key = cv2.waitKey(1) & 0xff
                if key in (ord('q'), 27):
                    break
                if key == 32:
                    paused = True
            if args.frames and count >= args.frames:
                break
    except KeyboardInterrupt:
        pass
    finally:
        if cap is not None:
            cap.release()
        if sct is not None:
            sct.close()
        if csv_handle is not None:
            csv_handle.close()
        if not args.no_gui:
            cv2.destroyAllWindows()
    print(f'[DONE] {count} frames. Mean demonstration tracking error: '
          f'{np.mean(errors):.1f}px' if errors else f'[DONE] {count} frames.')
    if args.csv:
        print(f'[DONE] CSV saved: {args.csv}')


if __name__ == '__main__':
    main()
