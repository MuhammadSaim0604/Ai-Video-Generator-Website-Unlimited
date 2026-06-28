let io = null;

function initSocket(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: true,       // mirrors the exact request origin — required when client uses withCredentials
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
  });

  io.on('connection', (socket) => {
    socket.on('subscribe_job', (jobId) => {
      socket.join(`job:${jobId}`);
    });
    socket.on('unsubscribe_job', (jobId) => {
      socket.leave(`job:${jobId}`);
    });
    socket.on('subscribe_admin', () => {
      socket.join('admin');
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
