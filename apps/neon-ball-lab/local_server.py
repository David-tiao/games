#!/usr/bin/env python3
"""Loopback-only visual detector for canvas JPEG frames (no hidden ball coordinates).

This method also works on Wayland: the page uploads only its own canvas pixels,
not a screenshot of the desktop. HTTP access is limited to 127.0.0.1.
"""
from __future__ import annotations
import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
from collections import OrderedDict
import json
import re
from pathlib import Path
import time
import urllib.parse

import cv2
import numpy as np

from tracker import VisualBallDetector, YoloBallDetector, AccelerationKalman, choose_detection
from mot_core import MultiBallTracker

MAX_IMAGE_BYTES = 5 * 1024 * 1024


class TrackingSession:
    """Independent filter, ID tracker, and timing for one browser client."""
    def __init__(self, future_seconds):
        self.filter = AccelerationKalman()
        self.multi = MultiBallTracker(future_seconds=future_seconds)
        self.missed = 0.
        self.last = None
        self.count = 0
        self.last_method = 'classical'
        self.fps = 0.
        self.accessed_at = time.monotonic()


class Pipeline:
    def __init__(self, mode: str, model: Path, imgsz: int, conf: float,
                 future: float):
        self.mode = mode
        self.classical = VisualBallDetector()
        self.yolo = None
        self.future_seconds = future
        # Keep the detector shared; keep every browser's temporal state isolated.
        self.sessions: OrderedDict[str, TrackingSession] = OrderedDict()
        self.start = time.perf_counter()
        if mode != 'classical' and model.exists():
            try:
                self.yolo = YoloBallDetector(model, imgsz, conf)
            except ImportError as e:
                if mode == 'yolo':
                    raise RuntimeError('Install ultralytics for YOLO mode') from e
        if mode == 'yolo' and self.yolo is None:
            raise RuntimeError(f'YOLO model not found: {model}. Run train_yolo.py first.')
        if self.yolo is None:
            print('[INFO] Using classical computer vision. Train YOLO to enable neural detection.')
        else:
            print('[INFO] Trained YOLO model loaded:', model)

    def step(self, image: np.ndarray, dt_override: float | None = None, session_id: str = 'legacy') -> dict:
        # Remove idle states and cap memory; 10 concurrent friends remain independent.
        now = time.perf_counter()
        for key in list(self.sessions):
            if now - self.sessions[key].accessed_at > 120.:
                del self.sessions[key]
        if session_id not in self.sessions:
            while len(self.sessions) >= 32:
                self.sessions.popitem(last=False)
            self.sessions[session_id] = TrackingSession(self.future_seconds)
        state = self.sessions[session_id]
        state.accessed_at = now
        self.sessions.move_to_end(session_id)
        dt = (float(np.clip(dt_override, .007, .35)) if dt_override is not None
              else (1/15 if state.last is None else float(np.clip(now - state.last, .007, .4))))
        state.last = now
        state.fps = (0.82*state.fps + .18/dt) if state.fps else 1/dt
        state.filter.predict(dt)
        neural = self.yolo.detect_all(image) if self.yolo is not None else []
        if self.mode == 'yolo':
            candidates = neural
        elif self.mode == 'classical':
            candidates = self.classical.detect_all(image)
        else:
            candidates = neural or self.classical.detect_all(image)
        multi_tracks = state.multi.update(candidates, dt)
        measurement = choose_detection(candidates, state.filter, state.missed)
        if measurement is not None:
            if state.missed > 1.2 or not state.filter.ready:
                state.filter.reset(measurement.x, measurement.y)
            else:
                state.filter.correct(measurement)
            state.missed = 0.
            state.last_method = measurement.source
        else:
            state.missed += dt
            if state.missed > 3.:
                state.filter.ready = False
        state.count += 1
        report = {
            'ok': True,
            'frame': state.count,
            'mode': 'YOLO + Kalman' if self.yolo is not None else 'OpenCV + Kalman',
            'detector': state.last_method,
            'measurement': None,
            'estimate': None,
            'future': None,
            'unseen_seconds': round(state.missed, 3),
            'inference_fps': round(state.fps, 1),
            'image_width': int(image.shape[1]),
            'image_height': int(image.shape[0]),
            'future_seconds': self.future_seconds,
            'tracks': multi_tracks,
            'visible_track_count': sum(1 for t in multi_tracks if t['visible'] and t['confirmed']),
        }
        if measurement is not None:
            report['measurement'] = [round(measurement.x, 2), round(measurement.y, 2),
                                     round(measurement.radius, 2), round(measurement.score, 2)]
        if state.filter.ready:
            estimate = state.filter.x[:, 0].tolist()
            report['estimate'] = [round(v, 4) for v in estimate]
            fx, fy, cov = state.filter.future(self.future_seconds)
            report['future'] = [round(fx, 3), round(fy, 3),
                                round(float(cov[0,0]), 2), round(float(cov[0,1]), 2),
                                round(float(cov[1,1]), 2)]
        return report


def make_handler(pipeline: Pipeline):
    class Handler(BaseHTTPRequestHandler):
        def common_headers(self, ctype='application/json; charset=utf-8'):
            self.send_header('Content-Type', ctype)
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Tracking-Session')
            self.send_header('Access-Control-Allow-Private-Network', 'true')

        def respond(self, status: int, data: dict):
            content = json.dumps(data, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.common_headers()
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        def do_OPTIONS(self):
            self.send_response(204)
            self.common_headers()
            self.end_headers()

        def do_GET(self):
            path = urllib.parse.urlsplit(self.path).path
            if path == '/health':
                self.respond(200, {'ok': True, 'mode': pipeline.mode,
                                   'yolo_loaded': pipeline.yolo is not None})
            elif path in ('/', '/index.html'):
                # Serve the updated page from the same loopback process as /frame.
                # This avoids stale file:// pages, and requires no second server.
                html = Path(__file__).resolve().with_name('index.html').read_bytes()
                self.send_response(200)
                self.common_headers('text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(html)))
                self.end_headers()
                self.wfile.write(html)
            else:
                self.respond(404, {'ok': False, 'error': 'Not found'})

        def do_POST(self):
            if urllib.parse.urlsplit(self.path).path != '/frame':
                self.respond(404, {'ok': False, 'error': 'Not found'})
                return
            try:
                length = int(self.headers.get('Content-Length', '-1'))
            except ValueError:
                length = -1
            if length < 1 or length > MAX_IMAGE_BYTES:
                self.respond(413, {'ok': False, 'error': 'Invalid frame size'})
                return
            body = self.rfile.read(length)
            data = np.frombuffer(body, dtype=np.uint8)
            frame = cv2.imdecode(data, cv2.IMREAD_COLOR)
            if frame is None or frame.shape[0] * frame.shape[1] > 12_000_000:
                self.respond(422, {'ok': False, 'error': 'Invalid image'})
                return
            try:
                # Session identity never reveals the physical ball's true coordinates.
                raw_id = self.headers.get('X-Tracking-Session', '')
                session_id = raw_id if re.fullmatch(r'[A-Za-z0-9_-]{8,64}', raw_id) else 'legacy'
                result = pipeline.step(frame, session_id=session_id)
                self.respond(200, result)
            except Exception as e:
                self.respond(500, {'ok': False, 'error': str(e)})

        def log_message(self, fmt, *args):
            if self.path != '/frame':
                super().log_message(fmt, *args)

    return Handler


def main():
    ap = argparse.ArgumentParser(description='Local webpage pixel tracker on 127.0.0.1')
    ap.add_argument('--mode', choices=['hybrid', 'yolo', 'classical'], default='hybrid')
    ap.add_argument('--model', type=Path, default=Path('runs/ball_yolo/weights/best.pt'))
    ap.add_argument('--imgsz', type=int, default=960)
    ap.add_argument('--conf', type=float, default=.18)
    ap.add_argument('--future', type=float, default=.35)
    ap.add_argument('--port', type=int, default=8765)
    args = ap.parse_args()
    pipeline = Pipeline(args.mode, args.model, args.imgsz, args.conf, args.future)
    server = HTTPServer(('127.0.0.1', args.port), make_handler(pipeline))
    print(f'[READY] Local visual tracker: http://127.0.0.1:{args.port}/health')
    print('[READY] Open http://127.0.0.1:8765/ then click "连接本地算法" (T). Ctrl+C to stop.')
    try:
        server.serve_forever(poll_interval=.3)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
