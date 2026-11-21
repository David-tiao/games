import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initializeAuth, registerAccount, authenticateAccount, createSession, getSessionUser } from "./auth.js";
import { createRoom, joinRoom, makeMove, pass, markDead, confirmScore, resume, resign, rematch, leave, leaveIfWaiting, coachForPlayer, disconnect } from "./roomManager.js";

await initializeAuth();

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT || 3100);
const host = process.env.HOST || "0.0.0.0";
const configuredOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)
  : true;

app.use(cors({ origin: configuredOrigins }));
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "go-online-server", timestamp: new Date().toISOString() });
});

// Simple per-IP authentication throttle for local deployments.
const authTries = new Map();
function authLimit(req,res,next) {
  const ip=req.ip, now=Date.now();
  let record=authTries.get(ip);
  if(!record||now-record.since>60000) record={since:now,count:0};
  record.count++;authTries.set(ip,record);
  if(record.count>20) return res.status(429).json({error:"登录尝试过于频繁，请稍后再试。"});
  next();
}
app.post("/api/auth/register", authLimit, async (req, res) => {
  try {
    const user = await registerAccount(req.body?.username, req.body?.password);
    res.status(201).json({ user, token: createSession(user) });
  } catch (error) {
    res.status(400).json({ error: error.message || "注册失败。" });
  }
});

app.post("/api/auth/login", authLimit, async (req, res) => {
  try {
    const user = await authenticateAccount(req.body?.username, req.body?.password);
    res.json({ user, token: createSession(user) });
  } catch (error) {
    res.status(401).json({ error: error.message || "登录失败。" });
  }
});

app.get("/api/me", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const user = getSessionUser(token);
  if (!user) return res.status(401).json({ error: "登录状态已失效，请重新登录。" });
  res.json({ user });
});

// Serve the built frontend in production; Vite serves it during development.
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, "../../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const io = new Server(httpServer, {
  cors: { origin: configuredOrigins },
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e5
});

io.use((socket, next) => {
  const user = getSessionUser(socket.handshake.auth?.token);
  if (!user) return next(new Error("UNAUTHORIZED"));
  socket.data.user = user;
  next();
});

function ack(callback, result) {
  if (typeof callback === "function") callback(result);
}
function broadcast(code, state) {
  if (state) io.to(code).emit("room:state", state);
}

io.on("connection", (socket) => {
  const user = socket.data.user;

  socket.on("room:create", (payload, callback) => {
    try {
      const state = createRoom(user, socket.id, payload?.size ?? 9);
      socket.join(state.code);
      ack(callback, { ok: true, data: state });
      broadcast(state.code, state);
    } catch (error) { ack(callback, { ok: false, error: error.message }); }
  });

  socket.on("room:join", (payload, callback) => {
    try {
      const state = joinRoom(payload?.code, user, socket.id);
      socket.join(state.code);
      ack(callback, { ok: true, data: state });
      broadcast(state.code, state);
    } catch (error) { ack(callback, { ok: false, error: error.message }); }
  });

  socket.on("room:rejoin", (payload, callback) => {
    try {
      const state = joinRoom(payload?.code, user, socket.id,{rejoin:true});
      socket.join(state.code);
      ack(callback, { ok: true, data: state });
      broadcast(state.code, state);
    } catch (error) { ack(callback, { ok: false, error: error.message }); }
  });

  socket.on("game:move", (payload, callback) => {
    try {
      const state = makeMove(user, socket.id, payload?.index);
      ack(callback, { ok: true, data: state });
      broadcast(state.code, state);
    } catch (error) { ack(callback, { ok: false, error: error.message }); }
  });

  for(const [event,operation] of [
    ["game:pass",()=>pass(user,socket.id)],
    ["game:mark-dead",payload=>markDead(user,socket.id,payload?.index)],
    ["game:confirm-score",()=>confirmScore(user,socket.id)],
    ["game:resume",()=>resume(user,socket.id)]
  ]) {
    socket.on(event, (payload, callback) => {
      try {const state=operation(payload);ack(callback,{ok:true,data:state});broadcast(state.code,state);}
      catch(error){ack(callback,{ok:false,error:error.message});}
    });
  }

  socket.on("game:resign", (_payload, callback) => {
    try {
      const state = resign(user, socket.id);
      ack(callback, { ok: true, data: state });
      broadcast(state.code, state);
    } catch (error) { ack(callback, { ok: false, error: error.message }); }
  });

  socket.on("game:rematch", (_payload, callback) => {
    try {
      const state = rematch(user, socket.id);
      ack(callback, { ok: true, data: state });
      broadcast(state.code, state);
    } catch (error) { ack(callback, { ok: false, error: error.message }); }
  });

  socket.on("coach:analyze", (_payload, callback) => {
    try { ack(callback, {ok:true,data:coachForPlayer(user,socket.id)}); }
    catch(error) { ack(callback, {ok:false,error:error.message}); }
  });

  socket.on("room:leave-if-waiting", (_payload, callback) => {
    try {
      const result=leaveIfWaiting(user,socket.id);
      if(result.code) socket.leave(result.code);
      if(result.closed&&result.code) io.to(result.code).emit("room:closed");
      ack(callback,{ok:true,data:{closed:true,code:result.code}});
    }catch(error){ack(callback,{ok:false,error:error.message});}
  });

  socket.on("room:leave", (_payload, callback) => {
    try {
      const result = leave(user, socket.id);
      if (result.code) socket.leave(result.code);
      if (result.closed && result.code) io.to(result.code).emit("room:closed");
      if (result.state) broadcast(result.code, result.state);
      ack(callback, { ok: true, data: result.state });
    } catch (error) { ack(callback, { ok: false, error: error.message }); }
  });

  socket.on("disconnect", () => {
    const state = disconnect(user.id, socket.id);
    if (state) broadcast(state.code, state);
  });
});

httpServer.listen(port, host, () => {
  console.log(`Go Online server listening on http://${host}:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});
