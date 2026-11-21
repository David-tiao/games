#!/usr/bin/env python3
"""Run real pixel detection + multi-object tracking on a video or synthetic demo.

Examples:
  python mot_video.py --source demo --frames 140 --output mot_demo.mp4
  python mot_video.py --source video --video your_clip.mp4 --mode yolo --output tracked.mp4
"""
from __future__ import annotations
import argparse
from collections import defaultdict, deque
from pathlib import Path
import math
import cv2
import numpy as np
from local_server import Pipeline


class DemoScene:
    def __init__(self, width=800, height=520, balls=4):
        self.width,self.height=width,height
        self.rng=np.random.default_rng(13)
        self.t=0.
        self.balls=[]
        for i in range(balls):
            r=18 + i%3*2
            x=110+i*170
            y=90+i%3*170
            direction=.47+1.15*i
            self.balls.append([float(x),float(y),math.cos(direction)*(105+10*i),math.sin(direction)*(105+10*i),r, i])
        self.trails=[deque(maxlen=50) for _ in self.balls]

    def next(self,dt=1/20):
        self.t+=dt
        bg=np.zeros((self.height,self.width,3),np.uint8)
        bg[:]=[27,23,9]
        for ix in range(40,self.width,50): cv2.line(bg,(ix,0),(ix,self.height),(33,39,27),1)
        for iy in range(40,self.height,50): cv2.line(bg,(0,iy),(self.width,iy),(33,39,27),1)
        for k,b in enumerate(self.balls):
            b[0]+=b[2]*dt; b[1]+=b[3]*dt
            # Non-linear motion + boundary bounces
            theta=.002*math.sin(self.t*1.5+k*2.3)
            ox,oy=b[2],b[3]
            b[2]=ox*math.cos(theta)-oy*math.sin(theta)
            b[3]=ox*math.sin(theta)+oy*math.cos(theta)
            r=b[4]
            if b[0]<r+20 or b[0]>self.width-r-20:
                b[2]*=-1
                b[0]=float(np.clip(b[0],r+20,self.width-r-20))
            if b[1]<r+20 or b[1]>self.height-r-20:
                b[3]*=-1
                b[1]=float(np.clip(b[1],r+20,self.height-r-20))
            self.trails[k].append((int(b[0]),int(b[1])))
        for k,b in enumerate(self.balls):
            pts=list(self.trails[k])
            hsv=np.uint8([[[((k*41+int(self.t//5)*23)%180),220,255]]])
            color=tuple(int(v) for v in cv2.cvtColor(hsv,cv2.COLOR_HSV2BGR)[0,0])
            for j in range(1,len(pts)):
                weight=j/len(pts)
                cc=tuple(int(c*weight*.75) for c in color)
                cv2.line(bg,pts[j-1],pts[j],cc,max(1,int(weight*5)),cv2.LINE_AA)
            x,y,r=int(b[0]),int(b[1]),int(b[4])
            cv2.circle(bg,(x,y),r+8,tuple(int(c*.25) for c in color),-1,cv2.LINE_AA)
            cv2.circle(bg,(x,y),r,color,-1,cv2.LINE_AA)
            cv2.circle(bg,(x-r//3,y-r//3),max(4,r//2),(255,255,255),-1,cv2.LINE_AA)
        return bg


def annotate(frame, report, traces, seconds=15):
    for tr in report.get('tracks', []):
        if not tr['confirmed']:
            continue
        tid=tr['id']; x=int(tr['x']); y=int(tr['y']); r=int(tr['radius'])
        # Stable display color per estimated identity, not per physical hue.
        color=tuple(int(v) for v in cv2.cvtColor(np.uint8([[[(tid*33)%180,240,255]]]),cv2.COLOR_HSV2BGR)[0,0])
        if tr['visible']:
            traces[tid].append((x,y))
        if len(traces[tid])>1:
            cv2.polylines(frame,[np.array(traces[tid],np.int32)],False,(0,0,0),5,cv2.LINE_AA)
            cv2.polylines(frame,[np.array(traces[tid],np.int32)],False,color,2,cv2.LINE_AA)
        boxcolor=color if tr['visible'] else (120,120,120)
        cv2.rectangle(frame,(x-r,y-r),(x+r,y+r),(0,0,0),5)
        cv2.rectangle(frame,(x-r,y-r),(x+r,y+r),boxcolor,2)
        cv2.putText(frame,f'ID {tid}',(x-r,y-r-8),cv2.FONT_HERSHEY_SIMPLEX,.55,(0,0,0),4,cv2.LINE_AA)
        cv2.putText(frame,f'ID {tid}',(x-r,y-r-8),cv2.FONT_HERSHEY_SIMPLEX,.55,color,2,cv2.LINE_AA)
        fx,fy=tr['predicted']
        cv2.line(frame,(x,y),(int(fx),int(fy)),color,1,cv2.LINE_AA)
        cv2.drawMarker(frame,(int(fx),int(fy)),color,cv2.MARKER_DIAMOND,14,2,cv2.LINE_AA)
    cv2.putText(frame,f"MOT | {report['mode']} | {report['visible_track_count']} visible",(18,32),cv2.FONT_HERSHEY_SIMPLEX,.68,(255,255,255),2,cv2.LINE_AA)
    return frame


def main():
    ap=argparse.ArgumentParser(description='Neon-ball multi-ID tracker video demo')
    ap.add_argument('--source',choices=['demo','video'],default='demo')
    ap.add_argument('--video',type=Path)
    ap.add_argument('--mode',choices=['hybrid','yolo','classical'],default='classical')
    ap.add_argument('--model',type=Path,default=Path('runs/ball_yolo/weights/best.pt'))
    ap.add_argument('--output',type=Path,default=Path('mot_demo.mp4'))
    ap.add_argument('--frames',type=int,default=160)
    ap.add_argument('--display',action='store_true')
    args=ap.parse_args()
    if args.source=='video' and (args.video is None or not args.video.exists()):
        ap.error('--video must point to a real video')
    pipeline=Pipeline(args.mode,args.model,640,.18,.35)
    scene=DemoScene() if args.source=='demo' else None
    video=cv2.VideoCapture(str(args.video)) if args.source=='video' else None
    if video is not None and not video.isOpened(): raise SystemExit('Cannot open video')
    source_fps = float(video.get(cv2.CAP_PROP_FPS)) if video is not None else 20.0
    source_dt = 1.0 / source_fps if source_fps > 1 else 1.0 / 20
    writer=None
    traces=defaultdict(lambda:deque(maxlen=260))
    frames_done=0
    try:
        while frames_done < args.frames:
            if scene:
                frame=scene.next()
            else:
                ok,frame=video.read()
                if not ok:break
            report=pipeline.step(frame, dt_override=source_dt)
            annotated=annotate(frame.copy(),report,traces)
            if writer is None:
                h,w=annotated.shape[:2]
                args.output.parent.mkdir(parents=True,exist_ok=True)
                writer=cv2.VideoWriter(str(args.output),cv2.VideoWriter_fourcc(*'mp4v'),source_fps,(w,h))
                if not writer.isOpened():raise RuntimeError('Cannot create MP4, check OpenCV video codec support')
            writer.write(annotated)
            frames_done+=1
            if args.display:
                cv2.imshow('MOT multi-ball demo',annotated)
                if cv2.waitKey(1) & 0xff == ord('q'):break
    finally:
        if writer is not None:writer.release()
        if video is not None:video.release()
        if args.display:cv2.destroyAllWindows()
    print('Video saved:',args.output,'frames:',frames_done)
    print('Tracking IDs created:',pipeline.multi.next_id-1)


if __name__=='__main__':main()
