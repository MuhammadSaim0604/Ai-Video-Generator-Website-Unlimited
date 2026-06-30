"use client";
import { io } from "socket.io-client";

let socket = null;

function createSocket(token) {
  const url =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://veo3free.fun";
  const s = io(url, {
    path: "/socket.io",
    transports: ["websocket"],
    withCredentials: true,
    auth: { token: token || "" },
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  s.on("connect", () => console.log("[Socket] Connected:", s.id));
  s.on("disconnect", () => console.log("[Socket] Disconnected"));
  s.on("connect_error", (err) => console.warn("[Socket] Error:", err.message));
  return s;
}

export function getSocket() {
  if (!socket) {
    socket = createSocket(null);
  }
  return socket;
}

export function reinitSocket(token) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = createSocket(token);
  return socket;
}

export function subscribeToJob(jobId, callbacks = {}) {
  const s = getSocket();
  s.emit("subscribe_job", jobId);

  const handlers = {};
  if (callbacks.onProcessing) {
    handlers.processing = (data) => {
      if (data.jobId === jobId) callbacks.onProcessing(data);
    };
    s.on("job:processing", handlers.processing);
  }
  if (callbacks.onCompleted) {
    handlers.completed = (data) => {
      if (data.jobId === jobId) callbacks.onCompleted(data);
    };
    s.on("job:completed", handlers.completed);
  }
  if (callbacks.onFailed) {
    handlers.failed = (data) => {
      if (data.jobId === jobId) callbacks.onFailed(data);
    };
    s.on("job:failed", handlers.failed);
  }

  return () => {
    s.emit("unsubscribe_job", jobId);
    if (handlers.processing) s.off("job:processing", handlers.processing);
    if (handlers.completed) s.off("job:completed", handlers.completed);
    if (handlers.failed) s.off("job:failed", handlers.failed);
  };
}

export function subscribeAdmin(callbacks = {}) {
  const adminToken =
    typeof window !== "undefined"
      ? localStorage.getItem("veo3_admin_token")
      : null;
  const s = getSocket();
  s.emit("subscribe_admin", { token: adminToken });
  if (callbacks.onQueueUpdate) s.on("queue:update", callbacks.onQueueUpdate);
  if (callbacks.onAccountsUpdated)
    s.on("accounts:updated", callbacks.onAccountsUpdated);
  if (callbacks.onSettingsUpdated)
    s.on("queue:settings_updated", callbacks.onSettingsUpdated);
  return () => {
    s.off("queue:update");
    s.off("accounts:updated");
    s.off("queue:settings_updated");
  };
}
