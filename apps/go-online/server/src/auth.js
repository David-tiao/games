import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scrypt = promisify(scryptCallback);
const DATA_DIR = fileURLToPath(new URL("../data/", import.meta.url));
const USERS_FILE = path.join(DATA_DIR, "users.json");
const sessions = new Map();
let users = [];

export async function initializeAuth() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(USERS_FILE, "utf8"));
    users = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    users = [];
    await persistUsers();
  }
}

async function persistUsers() {
  await mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${USERS_FILE}.tmp`;
  await writeFile(tempFile, JSON.stringify(users, null, 2), { mode: 0o600 });
  await rename(tempFile, USERS_FILE);
}

function publicUser(user) {
  return { id: user.id, username: user.username };
}

function validateCredentials(username, password) {
  if (typeof username !== "string" || !/^[a-zA-Z0-9_]{3,18}$/.test(username)) {
    throw new Error("用户名须为 3–18 位字母、数字或下划线。");
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new Error("密码长度须为 8–128 位。");
  }
}

export async function registerAccount(username, password) {
  validateCredentials(username, password);
  if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("这个用户名已被注册。");
  }
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  const user = {
    id: randomBytes(16).toString("hex"),
    username,
    salt: salt.toString("hex"),
    passwordHash: Buffer.from(hash).toString("hex"),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  await persistUsers();
  return publicUser(user);
}

export async function authenticateAccount(username, password) {
  if (typeof username !== "string" || typeof password !== "string") {
    throw new Error("用户名或密码错误。");
  }
  const user = users.find((item) => item.username.toLowerCase() === username.toLowerCase());
  if (!user) throw new Error("用户名或密码错误。");
  const derived = Buffer.from(await scrypt(password, Buffer.from(user.salt, "hex"), 64));
  const stored = Buffer.from(user.passwordHash, "hex");
  if (derived.length !== stored.length || !timingSafeEqual(derived, stored)) {
    throw new Error("用户名或密码错误。");
  }
  return publicUser(user);
}

export function createSession(user) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { user, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return token;
}

export function getSessionUser(token) {
  if (typeof token !== "string") return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session.user;
}
