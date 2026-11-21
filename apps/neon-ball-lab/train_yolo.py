#!/usr/bin/env python3
"""Train a real one-class neural detector, based on official Ultralytics APIs."""
from __future__ import annotations
import argparse
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', type=Path, default=Path('dataset/data.yaml'))
    ap.add_argument('--weights', default='yolo11n.pt',
                    help='Base pretrained YOLO11 nano weights (download on first use)')
    ap.add_argument('--epochs', type=int, default=35)
    ap.add_argument('--imgsz', type=int, default=640)
    ap.add_argument('--batch', type=int, default=8)
    ap.add_argument('--device', default=None, help='cpu or 0 for NVIDIA GPU; default auto')
    ap.add_argument('--workers', type=int, default=2)
    args = ap.parse_args()
    if not args.data.exists():
        ap.error('Dataset not found. Run: python generate_dataset.py')
    try:
        from ultralytics import YOLO
    except ImportError:
        ap.error('Please install dependencies: pip install -r requirements.txt')
    model = YOLO(args.weights)
    kw = dict(data=str(args.data.resolve()), epochs=args.epochs, imgsz=args.imgsz,
              batch=args.batch, workers=args.workers, project='runs', name='ball_yolo',
              exist_ok=True, seed=42, plots=True)
    if args.device is not None:
        kw['device'] = args.device
    model.train(**kw)
    print('Model weights:', Path('runs/ball_yolo/weights/best.pt').resolve())
    print('Start tracker: python tracker.py --source screen --mode yolo')


if __name__ == '__main__':
    main()
