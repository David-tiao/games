#!/usr/bin/env python3
"""Ultralytics built-in MOT baseline (ByteTrack or BoT-SORT).

This requires a trained one-class neon-ball YOLO model. It is independent of
our hand-written MOT state manager, so it is a useful engineering baseline.
"""
from __future__ import annotations
import argparse
from collections import defaultdict,deque
from pathlib import Path
import csv
import cv2
import numpy as np
from ultralytics import YOLO


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--video',type=Path,required=True)
    p.add_argument('--weights',type=Path,default=Path('runs/ball_yolo/weights/best.pt'))
    p.add_argument('--tracker',choices=['bytetrack','botsort'],default='bytetrack')
    p.add_argument('--output',type=Path,default=Path('bytetrack_output.mp4'))
    p.add_argument('--csv',type=Path,default=Path('bytetrack_results.csv'))
    p.add_argument('--imgsz',type=int,default=640)
    p.add_argument('--conf',type=float,default=.12)
    args=p.parse_args()
    if not args.video.exists() or not args.weights.exists():
        p.error('Video and trained YOLO weights must exist')
    model=YOLO(str(args.weights))
    reader=cv2.VideoCapture(str(args.video))
    if not reader.isOpened():raise RuntimeError('Cannot open video')
    fps=reader.get(cv2.CAP_PROP_FPS) or 20.
    width=int(reader.get(cv2.CAP_PROP_FRAME_WIDTH));height=int(reader.get(cv2.CAP_PROP_FRAME_HEIGHT))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    writer=cv2.VideoWriter(str(args.output),cv2.VideoWriter_fourcc(*'mp4v'),fps,(width,height))
    if not writer.isOpened():raise RuntimeError('Cannot create output MP4')
    traces=defaultdict(lambda:deque(maxlen=180))
    count=0
    try:
        with args.csv.open('w',newline='',encoding='utf-8') as f:
            csvwriter=csv.writer(f)
            csvwriter.writerow(['frame','id','cx','cy','w','h','conf'])
            while True:
                ok,frame=reader.read()
                if not ok:break
                # persist=True keeps tracking state across sequential frames.
                result=model.track(frame, persist=True, classes=[0], imgsz=args.imgsz,
                                   conf=args.conf,tracker=args.tracker+'.yaml',verbose=False)[0]
                if result.boxes is not None and result.boxes.id is not None:
                    xywh=result.boxes.xywh.cpu().numpy()
                    ids=result.boxes.id.int().cpu().tolist()
                    scores=result.boxes.conf.cpu().numpy()
                    for (x,y,w,h),tid,score in zip(xywh,ids,scores):
                        px,py=round(float(x)),round(float(y))
                        pts=traces[int(tid)];pts.append((px,py))
                        x1,y1,x2,y2=int(x-w/2),int(y-h/2),int(x+w/2),int(y+h/2)
                        color=(255,220,70) if int(tid)%2 else (90,240,255)
                        cv2.rectangle(frame,(x1,y1),(x2,y2),color,2)
                        cv2.putText(frame,f'ID {tid}',(x1,y1-9),cv2.FONT_HERSHEY_SIMPLEX,.58,color,2)
                        if len(pts)>1:
                            cv2.polylines(frame,[np.array(pts,dtype='int32')],False,color,2)
                        csvwriter.writerow([count,tid,round(float(x),2),round(float(y),2),round(float(w),2),round(float(h),2),round(float(score),4)])
                writer.write(frame)
                count+=1
    finally:
        reader.release();writer.release()
    print('Output video:',args.output,'CSV:',args.csv,'frames:',count)


if __name__=='__main__':main()
