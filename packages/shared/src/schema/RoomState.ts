import { Schema, MapSchema, type } from '@colyseus/schema';

export class NetworkPlayerState extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('string') character: string = 'Davis';
  @type('boolean') isReady: boolean = false;
  @type('boolean') connected: boolean = true;
  @type('number') slot: number = 0; // 0..3

  // 2.5D Coordinates & Velocity
  @type('number') x: number = 400;
  @type('number') y: number = 0;
  @type('number') z: number = 370;
  @type('number') vx: number = 0;
  @type('number') vy: number = 0;
  @type('number') vz: number = 0;
  @type('number') facing: number = 1; // 1 or -1

  // Animation & Frame state
  @type('number') frameId: number = 0;
  @type('number') frameTick: number = 0;

  // Combat stats
  @type('number') hp: number = 500;
  @type('number') mp: number = 500;
  @type('boolean') isGrounded: boolean = true;
  @type('boolean') isDead: boolean = false;

  // Sequence number acknowledged by server for client-side prediction reconciliation
  @type('number') lastProcessedInput: number = 0;
}

export class NetworkProjectileState extends Schema {
  @type('string') id: string = '';
  @type('string') ownerId: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') z: number = 0;
  @type('number') vx: number = 0;
  @type('number') facing: number = 1;
  @type('number') damage: number = 35;
}

export class NetworkRoomState extends Schema {
  @type('string') roomCode: string = '';
  @type('string') phase: string = 'lobby'; // 'lobby' | 'countdown' | 'battle' | 'gameover'
  @type('number') tick: number = 0;
  @type('number') countdown: number = 0;

  @type({ map: NetworkPlayerState }) players = new MapSchema<NetworkPlayerState>();
  @type({ map: NetworkProjectileState }) projectiles = new MapSchema<NetworkProjectileState>();
}
