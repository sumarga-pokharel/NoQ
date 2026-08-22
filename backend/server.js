import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import { initSockets } from './sockets/index.js';
import { clientOrigins, port, socketPath, validateEnvironment } from './config/env.js';

validateEnvironment();
await connectDB();

const server = http.createServer(app);
const io = new Server(server, {
  path: socketPath,
  cors: { origin: clientOrigins, credentials: true },
});

app.set('io', io);
initSockets(io);

server.listen(port, () => {
  console.log(`NoQ backend running on port ${port}`);
});
