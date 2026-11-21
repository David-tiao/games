#!/usr/bin/env python3
"""Generate labeled synthetic luminous-ball images for one-class YOLO training.

Only synthetic images are created; the tracker itself never reads hidden JS state.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import math

import cv2
import numpy as np


def make_image(size: int, rng: np.random.Generator):
    h = w = size
    # A family of navy/teal/black backgrounds, optionally with subtle grids.
    col = rng.integers([3, 9, 12], [24, 35, 38]).astype(np.float32)
    image = np.empty((h, w, 3), dtype=np.uint8)
    image[:] = col.astype(np.uint8)
    if rng.random() < .6:
        step = int(rng.integers(38, 82))
        grid_col = tuple(int(v) for v in (col + rng.integers(3, 9, size=3)))
        for pos in range(step, w, step):
            cv2.line(image, (pos, 0), (pos, h), grid_col, 1)
        for pos in range(step, h, step):
            cv2.line(image, (0, pos), (w, pos), grid_col, 1)
    for _ in range(int(rng.integers(30, 130))):
        px, py = int(rng.integers(w)), int(rng.integers(h))
        br = int(rng.integers(24, 100))
        image[py, px] = [br, br, br]

    # Training variety includes foreground UI distractors and short color lines.
    if rng.random() < .48:
        for _ in range(int(rng.integers(1, 4))):
            px, py = int(rng.integers(w)), int(rng.integers(h))
            cw, ch = int(rng.integers(30, 140)), int(rng.integers(9, 34))
            cv2.rectangle(image, (px, py), (min(w-1, px+cw), min(h-1, py+ch)),
                          (17, 45, 41), -1)
            cv2.putText(image, 'MOTION', (px+3, py+min(ch-2, 18)),
                        cv2.FONT_HERSHEY_SIMPLEX, .32, (110, 180, 155), 1, cv2.LINE_AA)

    radius = int(rng.integers(max(9, size//54), max(24, size//22)))
    # Position can approach boundaries, but the solid disk stays inside frame.
    x = int(rng.integers(radius+3, w-radius-3))
    y = int(rng.integers(radius+3, h-radius-3))
    hue = int(rng.integers(180))
    rgb = cv2.cvtColor(np.uint8([[[hue, 240, 245]]]), cv2.COLOR_HSV2BGR)[0, 0]
    color = tuple(int(v) for v in rgb)

    # Build a curved comet-tail in reverse physical time.
    point = np.array([float(x), float(y)])
    angle = rng.uniform(0, 2*math.pi)
    turn = rng.uniform(-.085, .085)
    tail = [(int(point[0]), int(point[1]))]
    for k in range(int(rng.integers(20, 78))):
        angle += turn + rng.normal(0, .012)
        if k % 14 == 0:
            turn += rng.normal(0, .02)
            turn = float(np.clip(turn, -.18, .18))
        point += [math.cos(angle)*rng.uniform(3.2, 8.), math.sin(angle)*rng.uniform(3.2, 8.)]
        tail.append((int(point[0]), int(point[1])))
    for k in range(len(tail)-1, 0, -1):
        fade = 1. - k/len(tail)
        c = tuple(int(v*fade*.84) for v in color)
        width = max(1, int(radius*.31*fade))
        cv2.line(image, tail[k], tail[k-1], c, width, cv2.LINE_AA)

    # Halo gradient plus opaque disk, inner highlight, and occasional rim.
    halo = np.zeros_like(image)
    cv2.circle(halo, (x, y), int(radius*2.3), color, -1, cv2.LINE_AA)
    halo = cv2.GaussianBlur(halo, (0, 0), max(5., radius*.72))
    image = cv2.addWeighted(image, 1, halo, rng.uniform(.25, .55), 0)
    cv2.circle(image, (x, y), radius+3, tuple(int(v*.48) for v in color), 1, cv2.LINE_AA)
    cv2.circle(image, (x, y), radius, color, -1, cv2.LINE_AA)
    cv2.circle(image, (x-3, y-4), max(3, radius//2),
               tuple(min(255, int(v*.25+190)) for v in color), -1, cv2.LINE_AA)
    cv2.circle(image, (x-radius//3, y-radius//3), max(2, radius//5),
               (255, 255, 255), -1, cv2.LINE_AA)

    if rng.random() < .14:
        image = cv2.GaussianBlur(image, (3, 3), .6)
    # Label only the solid sphere, NOT the glow, tail, or trail.
    label = f'0 {x/w:.6f} {y/h:.6f} {2*radius/w:.6f} {2*radius/h:.6f}\n'
    return image, label


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--out', type=Path, default=Path('dataset'))
    p.add_argument('--train', type=int, default=720)
    p.add_argument('--val', type=int, default=160)
    p.add_argument('--size', type=int, default=640)
    p.add_argument('--seed', type=int, default=20261117)
    args = p.parse_args()
    if args.size < 256 or args.train < 1 or args.val < 1:
        p.error('Require --size >=256 and positive train/val counts')
    root = args.out.resolve()
    rng = np.random.default_rng(args.seed)
    for split, count in [('train', args.train), ('val', args.val)]:
        image_dir, label_dir = root/split/'images', root/split/'labels'
        image_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)
        for i in range(count):
            im, label = make_image(args.size, rng)
            name = f'ball_{i:05d}'
            if not cv2.imwrite(str(image_dir/f'{name}.jpg'), im, [cv2.IMWRITE_JPEG_QUALITY, 93]):
                raise RuntimeError(f'Image write failure: {name}')
            (label_dir/f'{name}.txt').write_text(label)
        print(f'{split}: wrote {count} images with automatically generated YOLO labels')
    config = f'path: {root.as_posix()}\ntrain: train/images\nval: val/images\nnames:\n  0: neon_ball\n'
    (root/'data.yaml').write_text(config, encoding='utf-8')
    print('Dataset YAML:', root/'data.yaml')


if __name__ == '__main__':
    main()
