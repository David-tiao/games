from pathlib import Path
import sys
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tracker import (VisualBallDetector, AccelerationKalman, SyntheticScene,
                     Detection, choose_detection)
from generate_dataset import make_image


def test_synthetic_pixels_detectable():
    scene = SyntheticScene()
    detector = VisualBallDetector()
    errors = []
    for i in range(60):
        img, truth = scene.next()
        picks = detector.detect_all(img)
        if picks:
            errors.append(min(np.hypot(p.x-truth[0],p.y-truth[1]) for p in picks))
    assert len(errors) > 45
    assert np.median(errors) < 22


def test_kalman_constant_acceleration():
    f = AccelerationKalman()
    f.reset(10, 20)
    f.x[2, 0] = 100
    f.x[3, 0] = -20
    f.x[4, 0] = 10
    f.predict(.1)
    assert abs(f.x[0, 0] - 20.05) < 1e-6
    assert abs(f.x[1, 0] - 18) < 1e-6
    assert np.all(np.linalg.eigvalsh(f.P) >= -1e-6)


def test_observation_gate_rejects_outlier():
    f = AccelerationKalman()
    f.reset(90, 100)
    f.P = np.eye(6) * 10
    inside = Detection(92, 104, 16, .9, 'yolo')
    outside = Detection(450, 510, 16, .99, 'yolo')
    assert choose_detection([outside,inside], f, 0) is inside


def test_training_label_bounds():
    image, label = make_image(640, np.random.default_rng(3))
    assert image.shape == (640, 640, 3)
    parts = label.split()
    assert parts[0] == '0'
    assert all(0 < float(v) < 1 for v in parts[1:])
