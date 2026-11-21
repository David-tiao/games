#!/usr/bin/env python3
"""Multi-object tracking by detection + CV Kalman + gated Hungarian matching.

Only image detections are accepted. No JS ground-truth positions are used.
The algorithm intentionally uses weak/no appearance; the balls recolor periodically.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Sequence
import math

import numpy as np
from scipy.optimize import linear_sum_assignment

H = np.array([[1., 0., 0., 0.], [0., 1., 0., 0.]])
I = np.eye(4)
BIG = 1e6


@dataclass
class Track:
    id: int
    x: np.ndarray
    P: np.ndarray
    radius: float
    hits: int = 1
    age: int = 1
    missing: float = 0.0
    visible: bool = True
    score: float = 0.0
    det_index: int | None = None

    @classmethod
    def from_detection(cls, track_id: int, det, index: int, initial_speed_sigma=240.):
        x = np.array([float(det.x), float(det.y), 0., 0.])
        P = np.diag([36., 36., initial_speed_sigma**2, initial_speed_sigma**2])
        return cls(track_id, x, P, float(det.radius), score=float(det.score), det_index=index)

    def predict(self, dt: float, accel_sigma: float):
        f = np.array([[1., 0., dt, 0.],
                      [0., 1., 0., dt],
                      [0., 0., 1., 0.],
                      [0., 0., 0., 1.]])
        g = np.array([[dt*dt/2, 0.], [0., dt*dt/2], [dt, 0.], [0., dt]])
        q = (accel_sigma**2) * (g @ g.T)
        self.x = f @ self.x
        self.P = f @ self.P @ f.T + q
        self.P = 0.5*(self.P + self.P.T)
        self.age += 1
        self.visible = False
        self.det_index = None
        self.missing += dt

    def maha_squared(self, det, measurement_sigma: float) -> float:
        z = np.array([float(det.x), float(det.y)])
        y = z - H @ self.x
        s = H @ self.P @ H.T + np.eye(2) * measurement_sigma**2
        return float(y @ np.linalg.solve(s, y))

    def update(self, det, measurement_sigma: float, index: int):
        z = np.array([float(det.x), float(det.y)])
        r = np.eye(2) * measurement_sigma**2
        innovation = z - H @ self.x
        s = H @ self.P @ H.T + r
        # Use solve instead of explicitly inverting S.
        k = np.linalg.solve(s, H @ self.P).T
        self.x = self.x + k @ innovation
        a = I - k @ H
        self.P = a @ self.P @ a.T + k @ r @ k.T  # Joseph stable update
        self.P = 0.5 * (self.P + self.P.T)
        self.radius = 0.78 * self.radius + 0.22 * float(det.radius)
        self.score = float(det.score)
        self.hits += 1
        self.visible = True
        self.missing = 0.0
        self.det_index = index

    def result(self, future_seconds: float, min_hits: int):
        px, py, vx, vy = self.x.tolist()
        return {
            'id': self.id,
            'x': round(px, 2), 'y': round(py, 2),
            'vx': round(vx, 2), 'vy': round(vy, 2),
            'radius': round(self.radius, 1),
            'predicted': [round(px + vx * future_seconds, 2),
                          round(py + vy * future_seconds, 2)],
            'visible': self.visible,
            'confirmed': self.hits >= min_hits,
            'missed_seconds': round(self.missing, 3),
            'score': round(self.score, 3),
            'det_index': self.det_index,
            'uncertainty': round(math.sqrt(max(0, np.trace(self.P[:2, :2]))), 2),
        }


class MultiBallTracker:
    """Multi-target Kalman + Hungarian with track lifecycle and collision noise.

    The reported ID is a tracking estimate, not the webpage's physical ball ID.
    It can switch after ambiguous overlaps or collisions.
    """

    def __init__(self, max_missing=1.1, min_hits=2, max_tracks=20,
                 measurement_sigma=7., acceleration_sigma=950., gate=16.,
                 new_track_score=.22, future_seconds=.35):
        self.tracks: list[Track] = []
        self.next_id = 1
        self.max_missing = max_missing
        self.min_hits = min_hits
        self.max_tracks = max_tracks
        self.measurement_sigma = measurement_sigma
        self.acceleration_sigma = acceleration_sigma
        self.gate = gate
        self.new_track_score = new_track_score
        self.future_seconds = future_seconds
        self.frames = 0

    def update(self, detections: Sequence, dt: float) -> list[dict]:
        dt = float(np.clip(dt, 0.005, 0.35))
        self.frames += 1
        tracks = self.tracks

        # More process noise around likely collisions lets the velocity estimate
        # adapt faster to a bounce. No ground-truth collision event is consulted.
        collision_ids = set()
        for i, a in enumerate(tracks):
            for b in tracks[i+1:]:
                sep = np.linalg.norm(a.x[:2] - b.x[:2])
                if sep < a.radius + b.radius + 24:
                    collision_ids.add(a.id)
                    collision_ids.add(b.id)
        for tr in tracks:
            sigma = self.acceleration_sigma * (2.8 if tr.id in collision_ids else 1.0)
            tr.predict(dt, sigma)

        rows, cols = len(tracks), len(detections)
        used_detections = set()
        if rows and cols:
            # Append one dummy (unmatched) column per track. This avoids forcing
            # an implausible association to a real detection.
            unmatched_cost = self.gate + 2.0
            cost = np.full((rows, cols + rows), unmatched_cost, dtype=float)
            for i, tr in enumerate(tracks):
                for j, det in enumerate(detections):
                    d2 = tr.maha_squared(det, self.measurement_sigma)
                    if d2 > self.gate:
                        cost[i, j] = BIG
                        continue
                    # Radius helps disambiguate overlaps; it is deliberately weak.
                    # Color is not a hard identity cue because all balls may recolor.
                    radius_difference = abs(math.log(max(float(det.radius), 1.) / max(tr.radius, 1.)))
                    cost[i, j] = d2 + 2.5 * radius_difference + 0.7 * (1 - float(det.score))
            ii, jj = linear_sum_assignment(cost)
            for i, j in zip(ii, jj):
                if j >= cols or cost[i, j] >= unmatched_cost:
                    continue
                tracks[i].update(detections[j], self.measurement_sigma, j)
                used_detections.add(int(j))

        self.tracks = [tr for tr in tracks if tr.missing <= self.max_missing]
        for j, det in enumerate(detections):
            if j in used_detections or float(det.score) < self.new_track_score:
                continue
            if len(self.tracks) >= self.max_tracks:
                break
            self.tracks.append(Track.from_detection(self.next_id, det, j))
            self.next_id += 1

        return [tr.result(self.future_seconds, self.min_hits)
                for tr in self.tracks if tr.hits >= self.min_hits or tr.visible]
