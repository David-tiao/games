import { io, type Socket } from "socket.io-client";


export function createGameSocket(token: string): Socket {
  return io(window.location.origin, {
    path: "/play/gomoku/socket.io",
    autoConnect: false,
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 700,
    reconnectionDelayMax: 5000,
    timeout: 8000
  });
}
