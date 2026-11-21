import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initializeAuth, registerAccount, authenticateAccount, createSession, getSessionUser } from "./auth.js";
import { createRoom, joinRoom, rejoinRoom, makeMove, resign, requestRematch, leaveRoom, markDisconnected } from "./roomManager.js";

await initializeAuth();

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "0.0.0.0";
const configuredOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)
  : true;

app.use(cors({ origin: configuredOrigins }));
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "gomoku-online-server", timestamp: new Date().toISOString() });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const user = await registerAccount(req.body?.username, req.body?.password);
    res.status(201).json({ user, token: createSession(user) });
  } catch (error) {
    res.status(400).json({ error: error.message || "注册失败。" });
  }
});

app.post("/api/auth/login", async (req, res) => {
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

  socket.on("room:create", (_payload, callback) => {
    try {
      const state = createRoom(user, socket.id);
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
      const state = rejoinRoom(payload?.code, user, socket.id);
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

  socket.on("game:resign", (_payload, callback) => {
    try {
      const state = resign(user, socket.id);
      ack(callback, { ok: true, data: state });
      broadcast(state.code, state);
    } catch (error) { ack(callback, { ok: false, error: error.message }); }
  });

  socket.on("game:rematch", (_payload, callback) => {
    try {
      const state = requestRematch(user, socket.id);
      ack(callback, { ok: true, data: state });
      broadcast(state.code, state);
    } catch (error) { ack(callback, { ok: false, error: error.message }); }
  });

  socket.on("room:leave", (_payload, callback) => {
    try {
      const result = leaveRoom(user, socket.id);
      if (result.code) socket.leave(result.code);
      if (result.closed && result.code) io.to(result.code).emit("room:closed");
      if (result.state) broadcast(result.code, result.state);
      ack(callback, { ok: true, data: result.state });
    } catch (error) { ack(callback, { ok: false, error: error.message }); }
  });

  socket.on("disconnect", () => {
    const state = markDisconnected(user.id, socket.id);
    if (state) broadcast(state.code, state);
  });
});

httpServer.listen(port, host, () => {
  console.log(`Gomoku Online server listening on http://${host}:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});
