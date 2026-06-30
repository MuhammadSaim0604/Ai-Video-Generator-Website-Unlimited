const jwt = require('jsonwebtoken');

const USER_JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'changeme';
const ADMIN_JWT_SECRET = process.env.JWT_ADMIN_SECRET || 'veo3-admin-secret-change-in-prod';
const COOKIE_NAME = 'auth_token';

let io = null;

function parseCookieToken(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function initSocket(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
  });

  // Auth middleware — runs on every socket connection
  io.use((socket, next) => {
    // Try bearer token from socket auth object first
    const authToken = socket.handshake.auth?.token;
    if (authToken) {
      try {
        const payload = jwt.verify(authToken, USER_JWT_SECRET);
        if (payload.userId) {
          socket.data.userId = payload.userId;
          return next();
        }
      } catch (_) {}

      // Maybe it's an admin token
      try {
        const payload = jwt.verify(authToken, ADMIN_JWT_SECRET);
        if (payload.type === 'admin') {
          socket.data.isAdmin = true;
          socket.data.adminId = payload.adminId;
          return next();
        }
      } catch (_) {}
    }

    // Fallback: httpOnly cookie
    const cookieToken = parseCookieToken(socket.handshake.headers?.cookie);
    if (cookieToken) {
      try {
        const payload = jwt.verify(cookieToken, USER_JWT_SECRET);
        if (payload.userId) {
          socket.data.userId = payload.userId;
          return next();
        }
      } catch (_) {}
    }

    // Allow unauthenticated connections (public job subscriptions, etc.)
    next();
  });

  io.on('connection', (socket) => {
    socket.on('subscribe_job', (jobId) => {
      socket.join(`job:${jobId}`);
    });

    socket.on('unsubscribe_job', (jobId) => {
      socket.leave(`job:${jobId}`);
    });

    socket.on('subscribe_admin', (data) => {
      // Verify admin token passed in the event payload
      const token = data?.token;
      if (socket.data.isAdmin) {
        socket.join('admin');
        return;
      }
      if (token) {
        try {
          const payload = jwt.verify(token, ADMIN_JWT_SECRET);
          if (payload.type === 'admin') {
            socket.data.isAdmin = true;
            socket.data.adminId = payload.adminId;
            socket.join('admin');
          }
        } catch (_) {}
      }
    });
  });

  console.log('[Socket.io] Initialized');
  return io;
}

function emitJobUpdate(jobId, event, data) {
  if (!io) return;
  io.to(`job:${jobId}`).emit(event, { jobId, ...data });
}

function emitAdminUpdate(event, data) {
  if (!io) return;
  io.to('admin').emit(event, data);
}

function getIo() {
  return io;
}

module.exports = { initSocket, emitJobUpdate, emitAdminUpdate, getIo };
