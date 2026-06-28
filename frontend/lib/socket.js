"use client";

import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (!socket) {
    const socketUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:5000";
    socket = io(socketUrl, {
      path: "/socket.io",
      // Force HTTP long-polling only — WebSocket upgrades don't work through
      // Next.js rewrites (they're HTTP-only proxies). Polling is reliable and
      // sufficient for generation status updates.
      // transports: ["polling", "websocket"], // direct connection — both transports work
      transports: ["websocket"], // direct connection — both transports work
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => console.log("[Socket] Connected:", socket.id));
    socket.on("disconnect", () => console.log("[Socket] Disconnected"));
    socket.on("connect_error", (err) =>
      console.warn("[Socket] Error:", err.message),
    );
  }
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
  const s = getSocket();
  s.emit("subscribe_admin");
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
