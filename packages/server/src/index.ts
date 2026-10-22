import express from 'express';
import cors from 'cors';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { TICK_RATE } from '@lf-online/shared';
import { LFRoom } from './rooms/LFRoom.js';

const port = Number(process.env.PORT || 2567);

const transport = new WebSocketTransport({
  pingInterval: 3000,
  pingMaxRetries: 2,
});

const app = transport.getExpressApp();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'LF Online Authoritative Server',
    tickRate: TICK_RATE,
    uptime: process.uptime(),
  });
});

const gameServer = new Server({
  transport,
});

// Define Game Room with 5-character room code filter
gameServer.define('game_room', LFRoom).filterBy(['roomCode']);

async function bootstrap() {
  await gameServer.listen(port);
  console.log(`===============================================`);
  console.log(`⚔️  LF Online Server listening on port ${port}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${port}`);
  console.log(`⏱️  Simulation Rate: ${TICK_RATE} TPS (Server Authoritative)`);
  console.log(`===============================================`);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
