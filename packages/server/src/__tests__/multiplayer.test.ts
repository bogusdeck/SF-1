import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client } from '@colyseus/sdk';
import { LFRoom, generateRoomCode } from '../rooms/LFRoom.js';
import { NetworkRoomState } from '@lf-online/shared';

describe('Phase 4: Colyseus Authoritative Multiplayer & Rooms', () => {
  let gameServer: Server;
  const TEST_PORT = 2575;

  beforeAll(async () => {
    const transport = new WebSocketTransport();
    gameServer = new Server({ transport });
    gameServer.define('game_room', LFRoom).filterBy(['roomCode']);
    await gameServer.listen(TEST_PORT);
  });

  afterAll(async () => {
    await gameServer.gracefullyShutdown(false);
  });

  it('should generate valid 5-character uppercase alphanumeric room codes', () => {
    const code1 = generateRoomCode();
    const code2 = generateRoomCode();

    expect(code1).toHaveLength(5);
    expect(code2).toHaveLength(5);
    expect(code1).toMatch(/^[A-Z2-9]{5}$/);
    expect(code2).toMatch(/^[A-Z2-9]{5}$/);
  });

  it('should allow player 1 to create room and player 2 to join via room code', async () => {
    const client1 = new Client(`http://localhost:${TEST_PORT}`);
    const room1 = await client1.create<any, NetworkRoomState>(
      'game_room',
      {
        create: true,
        name: 'Player 1 (Davis)',
        character: 'Davis',
      },
      NetworkRoomState
    );

    expect(room1.sessionId).toBeDefined();

    // Wait for roomCode in state
    let roomCode = '';
    await new Promise<void>((resolve) => {
      room1.onStateChange((state) => {
        if (state.roomCode) {
          roomCode = state.roomCode;
          resolve();
        }
      });
    });

    expect(roomCode).toHaveLength(5);

    // Player 2 joins with the 5-character code
    const client2 = new Client(`http://localhost:${TEST_PORT}`);
    const room2 = await client2.joinOrCreate<any, NetworkRoomState>(
      'game_room',
      {
        roomCode,
        name: 'Player 2 (Dennis)',
        character: 'Dennis',
      },
      NetworkRoomState
    );

    expect(room2.sessionId).toBeDefined();

    // Verify room has 2 players
    await new Promise((r) => setTimeout(r, 150));
    expect(room1.state.players.size).toBe(2);
    expect(room2.state.players.size).toBe(2);

    const p1 = room1.state.players.get(room1.sessionId)!;
    const p2 = room1.state.players.get(room2.sessionId)!;

    expect(p1.character).toBe('Davis');
    expect(p2.character).toBe('Dennis');
    expect(p1.hp).toBe(500);
    expect(p2.hp).toBe(500);

    await room1.leave();
    await room2.leave();
  });

  it('should synchronize character select and ready-up state across players', async () => {
    const client1 = new Client(`http://localhost:${TEST_PORT}`);
    const room1 = await client1.create<any, NetworkRoomState>(
      'game_room',
      { create: true, name: 'P1' },
      NetworkRoomState
    );

    let roomCode = '';
    await new Promise<void>((resolve) => {
      room1.onStateChange((state) => {
        if (state.roomCode) {
          roomCode = state.roomCode;
          resolve();
        }
      });
    });

    const client2 = new Client(`http://localhost:${TEST_PORT}`);
    const room2 = await client2.joinOrCreate<any, NetworkRoomState>(
      'game_room',
      { roomCode, name: 'P2' },
      NetworkRoomState
    );

    // P2 changes character to Dennis
    room2.send('select_character', { character: 'Dennis' });
    await new Promise((r) => setTimeout(r, 100));

    expect(room1.state.players.get(room2.sessionId)?.character).toBe('Dennis');

    // Both players ready up
    room1.send('ready', { ready: true });
    room2.send('ready', { ready: true });

    await new Promise((r) => setTimeout(r, 150));
    expect(room1.state.phase).toBe('countdown');

    await room1.leave();
    await room2.leave();
  });

  it('should respond to ping messages with round-trip latency data', async () => {
    const client = new Client(`http://localhost:${TEST_PORT}`);
    const room = await client.create<any, NetworkRoomState>(
      'game_room',
      { create: true },
      NetworkRoomState
    );

    const clientNow = Date.now();
    const pongPromise = new Promise<{ clientTime: number; serverTime: number }>((resolve) => {
      room.onMessage('pong', (data) => resolve(data));
    });

    room.send('ping', { clientTime: clientNow });
    const pong = await pongPromise;

    expect(pong.clientTime).toBe(clientNow);
    expect(pong.serverTime).toBeGreaterThan(0);

    await room.leave();
  });
});
