from pathlib import Path
import sys
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from mot_core import MultiBallTracker
from tracker import Detection
from generate_multi_dataset import make_multi_image


def det(x,y,r=17,score=.95):
    return Detection(float(x),float(y),float(r),float(score),'synthetic')


def test_two_separated_balls_keep_id():
    tracker=MultiBallTracker()
    first={}
    for t in range(50):
        observations=[det(110+t*3,140),det(420-t*2,330)]
        out=tracker.update(observations[::-1] if t%2 else observations,.05)
        visible=sorted((p for p in out if p['visible']),key=lambda p:p['y'])
        if t==2: first={round(o['y']):o['id'] for o in visible}
        if t>4:
            assert len(visible)==2
            assert [o['id'] for o in visible] == [first[140],first[330]]


def test_occlusion_shorter_than_timeout_preserves_id():
    tracker=MultiBallTracker(max_missing=.8)
    tid=None
    for i in range(10):
        out=tracker.update([det(40+4*i,80)],.05)
        tid=out[0]['id']
    for i in range(8):
        out=tracker.update([],.05)
        assert any(o['id']==tid for o in out)
    out=tracker.update([det(40+4*18,80)],.05)
    assert any(o['id']==tid and o['visible'] for o in out)


def test_distant_new_detection_creates_new_id():
    tracker=MultiBallTracker()
    for i in range(5): tracker.update([det(30+i*2,30)],.05)
    out=tracker.update([det(42,30),det(560,300)],.05)
    assert len(set(t['id'] for t in out if t['visible']))==2


def test_multi_train_labels():
    im,labels=make_multi_image(384,np.random.default_rng(2),min_balls=4,max_balls=4)
    assert im.shape==(384,384,3)
    assert len(labels.strip().splitlines())==4
    for row in labels.strip().splitlines():
        cls,*numbers=row.split()
        assert cls=='0'
        assert all(0<float(v)<1 for v in numbers)
