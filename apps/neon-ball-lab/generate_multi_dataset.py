#!/usr/bin/env python3
"""Multi-ball synthetic YOLO dataset: multiple labelled solid sphere boxes.

Images emulate the browser's neon heads, colorful long tails, and occlusion.
No label is assigned to the luminous tail; all classes are `neon_ball` (0).
"""
from __future__ import annotations
import argparse
import math
from pathlib import Path
import cv2
import numpy as np


def make_multi_image(size: int, rng: np.random.Generator, min_balls=1, max_balls=8):
    if min_balls < 1 or max_balls < min_balls:
        raise ValueError('Invalid ball count')
    h = w = size
    bg = np.zeros((h,w,3), np.uint8)
    bg[:] = rng.integers([5,8,12],[23,27,38]).tolist()
    if rng.random() < 0.7:
        step = int(rng.integers(35,78))
        for c in range(step,w,step): cv2.line(bg,(c,0),(c,h),(14,34,34),1)
        for c in range(step,h,step): cv2.line(bg,(0,c),(w,c),(14,34,34),1)
    for _ in range(int(rng.integers(10,100))):
        x,y = rng.integers(0,w), rng.integers(0,h)
        bg[y,x] = rng.integers(40,100)

    count = int(rng.integers(min_balls,max_balls+1))
    balls = []
    for i in range(count):
        r = int(rng.integers(max(8,size//57),max(16,size//27)))
        x = int(rng.integers(r+4,w-r-4))
        y = int(rng.integers(r+4,h-r-4))
        # Most samples separate visually; some include near-collisions or overlaps.
        if i and rng.random()<.25:
            anchor = balls[int(rng.integers(len(balls)))]
            a = float(rng.uniform(0,2*math.pi))
            dist = float(rng.uniform(r*0.5,r + anchor[2] + 12))
            x = int(np.clip(anchor[0]+dist*math.cos(a),r+4,w-r-4))
            y = int(np.clip(anchor[1]+dist*math.sin(a),r+4,h-r-4))
        hue = int(rng.integers(0,180))
        color = tuple(map(int,cv2.cvtColor(np.uint8([[[hue,235,255]]]),cv2.COLOR_HSV2BGR)[0,0]))
        balls.append((x,y,r,color))

    # Render distant tails first, then physical spheres. Full individual circles
    # are labelled, even during partial visual occlusion.
    for x,y,r,color in balls:
        angle = float(rng.uniform(0,2*math.pi))
        delta = float(rng.uniform(-0.15,0.15))
        pts = [(x,y)]
        p = np.array([x*1.0,y*1.0]); direction=angle
        for t in range(int(rng.integers(18,90))):
            direction+=delta + float(rng.normal(0,.018))
            p+=np.array([math.cos(direction),math.sin(direction)])*float(rng.uniform(3,8))
            pts.append((int(p[0]),int(p[1])))
        for j in range(len(pts)-1,0,-1):
            fade=(len(pts)-j)/len(pts)
            rgb=tuple(int(c*fade*.77) for c in color)
            cv2.line(bg,pts[j],pts[j-1],rgb,max(1,int(r*.34*fade)),cv2.LINE_AA)

    # Draw the heads after tails. Images remain difficult when heads overlap.
    for x,y,r,color in balls:
        halo = np.zeros_like(bg)
        cv2.circle(halo,(x,y),r*2,color,-1,cv2.LINE_AA)
        halo=cv2.GaussianBlur(halo,(0,0), max(4,r*.7))
        bg=cv2.addWeighted(bg,1.0,halo,float(rng.uniform(.24,.52)),0)
        cv2.circle(bg,(x,y),r,color,-1,cv2.LINE_AA)
        cv2.circle(bg,(x-r//3,y-r//3),max(2,r//3),(255,255,255),-1,cv2.LINE_AA)

    labels = ''.join(f'0 {x/w:.6f} {y/h:.6f} {2*r/w:.6f} {2*r/h:.6f}\n'
                     for x,y,r,_ in balls)
    return bg, labels


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--out',type=Path,default=Path('dataset_multi'))
    ap.add_argument('--train',type=int,default=1000)
    ap.add_argument('--val',type=int,default=200)
    ap.add_argument('--size',type=int,default=640)
    ap.add_argument('--max-balls',type=int,default=8)
    ap.add_argument('--seed',type=int,default=20261118)
    a=ap.parse_args()
    if a.size<256 or a.train<1 or a.val<1 or not 1<=a.max_balls<=16: ap.error('Invalid parameters')
    a.out=a.out.resolve()
    rng=np.random.default_rng(a.seed)
    for split, total in [('train',a.train),('val',a.val)]:
        image_dir=a.out/split/'images'; label_dir=a.out/split/'labels'
        image_dir.mkdir(parents=True,exist_ok=True);label_dir.mkdir(parents=True,exist_ok=True)
        for i in range(total):
            image,labels=make_multi_image(a.size,rng,max_balls=a.max_balls)
            stem=f'multi_{i:05d}'
            if not cv2.imwrite(str(image_dir/f'{stem}.jpg'),image,[cv2.IMWRITE_JPEG_QUALITY,94]):
                raise RuntimeError('Could not save training image')
            (label_dir/f'{stem}.txt').write_text(labels,encoding='utf-8')
        print(f'{split}: {total} multi-ball images')
    (a.out/'data.yaml').write_text(f'path: {a.out.as_posix()}\ntrain: train/images\nval: val/images\nnames:\n  0: neon_ball\n')
    print('Training data:',a.out/'data.yaml')

if __name__=='__main__': main()
