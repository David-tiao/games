import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const port = Number(process.env.PORT || 3200);
const host = process.env.HOST || '0.0.0.0';
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json; charset=utf-8', '.ico':'image/x-icon' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname === '/api/health') {
      res.writeHead(200, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
      res.end(JSON.stringify({ok:true,app:'Star Array',version:'0.1.0',mode:'single-player'})); return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {res.writeHead(405);res.end();return;}
    const safe = decodeURIComponent(url.pathname);
    let file;
    if (safe === '/' || safe === '/index.html') file=path.join(root,'client','index.html');
    else if (safe.startsWith('/client/')) file=path.resolve(root,safe.slice(1));
    else if (safe.startsWith('/shared/')) file=path.resolve(root,safe.slice(1));
    else {res.writeHead(404);res.end('Not found');return;}
    if (!file.startsWith(root+path.sep)) {res.writeHead(403);res.end('Forbidden');return;}
    const fstat=await stat(file); if(!fstat.isFile()) throw new Error('Not a file');
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD') res.end(); else res.end(data);
  } catch {res.writeHead(404);res.end('Not found');}
});
server.on('error', err => {if(err.code==='EADDRINUSE'){console.error(`端口 ${port} 已被占用。请先关闭旧的星阵服务器，或使用 PORT=3201 ./start.sh`);process.exitCode=1;} else {console.error(err);process.exitCode=1;}});
server.listen(port,host,()=>console.log(`STAR ARRAY V0.1\n本机: http://localhost:${port}\n局域网: http://<你的Linux-IP>:${port}\n按 Ctrl+C 停止。`));
