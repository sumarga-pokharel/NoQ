// Real-time layer. One room per office (`office:<providerId>`), joined by:
// - the consumer's TicketPage (to get live position/wait updates)
// - the office DisplayPage board
// - the office DashboardPage
// Controllers call `req.app.get('io')` and emit `queue:update` after any
// change (join, call next, skip, complete, leave) with a fresh snapshot.

let ioInstance = null;

export const initSockets = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    socket.on('office:join', (providerId) => {
      if (providerId) socket.join(`office:${providerId}`);
    });

    socket.on('office:leave', (providerId) => {
      if (providerId) socket.leave(`office:${providerId}`);
    });
  });
};

export const emitQueueUpdate = (providerId, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`office:${providerId}`).emit('queue:update', payload);
};

export const emitTicketUpdate = (providerId, ticket) => {
  if (!ioInstance) return;
  ioInstance.to(`office:${providerId}`).emit('ticket:update', ticket);
};
