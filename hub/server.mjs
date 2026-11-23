import http from 'node:http';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(project, 'hub');
const port = Number(process.env.PORT || 3300);
const host = process.env.HOST || '0.0.0.0';
const children = [];
const backends = { go: null, gomoku: null, balls: null };
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};

async function freePort() {
  return new Promise((resolve,reject)=>{
    const s=net.createServer();
    s.once('error',reject);
    s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n));});
  });
}
function respond(res,code,body,type='text/plain; charset=utf-8') {
  res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
}
async function staticFile(req,res,base,filePath) {
  if(!['GET','HEAD'].includes(req.method))return respond(res,405,'Method not allowed');
  let resolved;
  try { resolved=path.resolve(base,'.'+decodeURIComponent(filePath)); } catch { return respond(res,400,'Bad URI'); }
  if(resolved!==base&&!resolved.startsWith(base+path.sep)) return respond(res,403,'Forbidden');
  try {
    const info=await fs.stat(resolved);
    if(!info.isFile()) throw Error('Directory');
    const bytes=await fs.readFile(resolved);
    res.writeHead(200,{'Content-Type':MIME[path.extname(resolved)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch{respond(res,404,'Not found');}
}
function proxyHttp(req,res,key,target) {
  const b=backends[key];
  if(!b)return respond(res,503,`${key} starting; reload in a moment`);
  const options={hostname:'127.0.0.1',port:b,path:target,method:req.method,headers:{...req.headers,host:`127.0.0.1:${b}`}};
  const p=http.request(options,upstream=>{
    res.writeHead(upstream.statusCode||502,upstream.headers);
    upstream.pipe(res);
  });
  p.setTimeout(20000,()=>p.destroy(new Error('Backend timeout')));
  p.on('error',()=>{if(!res.headersSent)respond(res,502,`${key} is unavailable. Check terminal logs.`);else res.destroy();});
  req.pipe(p);
}
function proxyUpgrade(req,socket,head,key,target) {
  const b=backends[key];
  if(!b){socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');return;}
  const upstream=net.connect(b,'127.0.0.1');
  upstream.once('connect',()=>{
    let headers='';
    for(let i=0;i<req.rawHeaders.length;i+=2){
      const h=req.rawHeaders[i];
      headers+=`${h}: ${h.toLowerCase()==='host'?`127.0.0.1:${b}`:req.rawHeaders[i+1]}\r\n`;
    }
    upstream.write(`${req.method} ${target} HTTP/1.1\r\n${headers}\r\n`);
    if(head?.length)upstream.write(head);
    upstream.pipe(socket).pipe(upstream);
  });
  upstream.once('error',()=>{if(!socket.destroyed)socket.destroy();});
  socket.once('error',()=>upstream.destroy());
  socket.once('close',()=>upstream.destroy());
}
function routeProxy(p) {
  for(const [key,prefix] of [['go','/play/go'],['gomoku','/play/gomoku']]) {
    if(p===prefix || p.startsWith(prefix+'/')) return {key,prefix,target:p.slice(prefix.length)||'/'};
  }
  return null;
}
const server=http.createServer(async(req,res)=>{
  let u;
  try{u=new URL(req.url,'http://localhost');}catch{return respond(res,400,'Bad URL');}
  const p=u.pathname;
  if(p==='/api/health')return respond(res,200,JSON.stringify({ok:true,version:'1.6.0',backends:Object.fromEntries(Object.entries(backends).map(([k,v])=>[k,!!v]))}),'application/json; charset=utf-8');
  if(p==='/api/services'){
    const values=await Promise.all(Object.entries(backends).map(async([key,b])=>{
      if(!b)return [key,false];
      try{const r=await fetch(`http://127.0.0.1:${b}${key==='balls'?'/health':'/api/health'}`,{signal:AbortSignal.timeout(1500)});return [key,r.ok];}catch{return [key,false];}
    }));
    return respond(res,200,JSON.stringify(Object.fromEntries(values)),'application/json; charset=utf-8');
  }
  // Same-origin canvas JPEG endpoint: browsers on friends' phones must not talk to their own 127.0.0.1.
  if(p==='/play/balls/frame' || p==='/play/balls/health'){
    if(p.endsWith('/frame') && req.method!=='POST')return respond(res,405,'Method not allowed');
    if(p.endsWith('/health') && req.method!=='GET')return respond(res,405,'Method not allowed');
    if(!backends.balls)return respond(res,503,JSON.stringify({ok:false,error:'Python tracker not installed. Run ./scripts/install-ball-tracker.sh then restart games. Browser demo works without it.'}),'application/json; charset=utf-8');
    return proxyHttp(req,res,'balls',p.endsWith('/frame')?'/frame':'/health');
  }
  const proxy=routeProxy(p);
  if(proxy){
    if(p===proxy.prefix)return respond(res,302,'',undefinedWithRedirect(res,proxy.prefix+'/'));
    return proxyHttp(req,res,proxy.key,proxy.target+u.search);
  }
  if(p==='/')return staticFile(req,res,path.join(root,'public'),'/index.html');
  if(p.startsWith('/assets/'))return staticFile(req,res,path.join(root,'public'),p);
  if(p==='/play/balls'||p==='/play/balls/')return staticFile(req,res,path.join(project,'apps/neon-ball-lab'),'/index.html');
  if(p==='/learn/balls'||p==='/learn/balls/')return staticFile(req,res,path.join(root,'learning'),'/balls.html');
  if(p==='/play/star'||p==='/play/star/')return staticFile(req,res,path.join(project,'apps/star-array/client'),'/index.html');
  if(p.startsWith('/play/star/client/'))return staticFile(req,res,path.join(project,'apps/star-array/client'),p.slice('/play/star/client'.length));
  if(p.startsWith('/play/star/shared/'))return staticFile(req,res,path.join(project,'apps/star-array/shared'),p.slice('/play/star/shared'.length));
  if(p==='/play/basketball'||p==='/play/basketball/')return staticFile(req,res,path.join(project,'apps/basketball'),'/index.html');
  if(p==='/play/basketball/game.js'||p==='/play/basketball/engine.mjs'||p==='/play/basketball/stickman.mjs'||p==='/play/basketball/style.css')return staticFile(req,res,path.join(project,'apps/basketball'),p.slice('/play/basketball'.length));
  if(p==='/play/mines'||p==='/play/mines/')return staticFile(req,res,path.join(root,'learning'),'/mines.html');
  if(p==='/learn/gomoku'||p==='/learn/gomoku/')return staticFile(req,res,path.join(root,'learning'),'/gomoku.html');
  if(p.startsWith('/learn/assets/'))return staticFile(req,res,path.join(root,'learning'),p.slice('/learn'.length));
  if(p==='/learn/mines'||p==='/learn/mines/')return staticFile(req,res,path.join(root,'learning'),'/mines.html');
  respond(res,404,'404 · Page not found');
});
function undefinedWithRedirect(res,location){res.setHeader('Location',location);return 'text/plain';}
server.on('upgrade',(req,socket,head)=>{
  let u;
  try{u=new URL(req.url,'http://localhost');}catch{socket.destroy();return;}
  const p=routeProxy(u.pathname);
  if(!p||!p.target.startsWith('/socket.io/')){socket.destroy();return;}
  proxyUpgrade(req,socket,head,p.key,p.target+u.search);
});
async function startBackend(key,relative) {
  const p=await freePort();backends[key]=p;
  const child=spawn(process.execPath,[path.join(project,relative)],{cwd:path.dirname(path.join(project,relative)),env:{...process.env,PORT:String(p),HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',v=>process.stdout.write(`[${key}] ${v}`));
  child.stderr.on('data',v=>process.stderr.write(`[${key}] ${v}`));
  child.on('exit',(code)=>{if(backends[key]===p)backends[key]=null;console.error(`[${key}] 后端退出，状态 ${code}`);});
  children.push(child);
}
async function startBallTracker() {
  const dir=path.join(project,'apps/neon-ball-lab');
  const python=process.env.BALL_PYTHON || path.join(dir,'.venv/bin/python');
  if(!existsSync(python)){
    console.log('[balls] 浏览器演示可用；如需 OpenCV + Kalman + MOT，运行 ./scripts/install-ball-tracker.sh 后重启大厅。');
    return;
  }
  const check=spawnSync(python,['-c','import cv2, numpy, scipy'],{cwd:dir,timeout:15000,encoding:'utf8'});
  if(check.status!==0){
    console.warn('[balls] Python 依赖不齐，保持浏览器演示模式。安装命令：./scripts/install-ball-tracker.sh');
    return;
  }
  const mode=process.env.BALL_TRACKING_MODE||'hybrid';
  if(!['hybrid','classical','yolo'].includes(mode))throw Error(`Invalid BALL_TRACKING_MODE: ${mode}`);
  const localPort=await freePort();
  const child=spawn(python,['-u','local_server.py','--mode',mode,'--port',String(localPort)],{
    cwd:dir,env:{...process.env,PYTHONUNBUFFERED:'1'},stdio:['ignore','pipe','pipe']
  });
  backends.balls=localPort;
  child.stdout.on('data',data=>process.stdout.write(`[balls] ${data}`));
  child.stderr.on('data',data=>process.stderr.write(`[balls] ${data}`));
  child.on('exit',code=>{if(backends.balls===localPort)backends.balls=null;console.warn(`[balls] Python tracker exited (${code}). Browser demo remains available.`);});
  children.push(child);
}
function stop(){for(const c of children){if(!c.killed)c.kill('SIGTERM');}server.close();}
process.on('SIGINT',()=>{stop();process.exit(0);});
process.on('SIGTERM',()=>{stop();process.exit(0);});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`游戏大厅端口 ${port} 已被占用，试试 PORT=3301 ./start.sh`:e);process.exitCode=1;});
server.listen(port,host,async()=>{
  console.log(`\n🎮 六合一游戏大厅 V1.6\n本机：http://localhost:${port}\n局域网：http://你的电脑IP:${port}\n对外只有一个端口；后端仅监听本机内部端口。\n按 Ctrl+C 结束。\n`);
  try{await Promise.all([startBackend('go','apps/go-online/server/src/index.js'),startBackend('gomoku','apps/gomoku-online/server/src/index.js'),startBallTracker()]);}
  catch(e){console.error('内部服务启动失败:',e);}
});
