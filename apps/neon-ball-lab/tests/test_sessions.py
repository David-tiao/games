"""Integrated Game Universe behavior: independent tracker state per browser tab."""
from pathlib import Path
import sys
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from local_server import Pipeline


def test_sessions_do_not_share_tracking_frame_sequence():
    model=Pipeline('classical', Path('/missing.weights'), 640, .18, .35)
    black=np.zeros((200, 200, 3), dtype=np.uint8)
    assert model.step(black, session_id='viewer-A')['frame'] == 1
    assert model.step(black, session_id='viewer-B')['frame'] == 1
    assert model.step(black, session_id='viewer-A')['frame'] == 2
    assert model.sessions['viewer-A'].filter is not model.sessions['viewer-B'].filter
    assert model.sessions['viewer-A'].multi is not model.sessions['viewer-B'].multi


def test_sessions_prune_after_timeout():
    model=Pipeline('classical', Path('/missing.weights'), 640, .18, .35)
    black=np.zeros((160, 160, 3), dtype=np.uint8)
    model.step(black, session_id='outdated')
    model.sessions['outdated'].accessed_at -= 180
    model.step(black, session_id='active')
    assert 'outdated' not in model.sessions
