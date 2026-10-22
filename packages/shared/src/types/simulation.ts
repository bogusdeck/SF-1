export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
  jump: boolean;
  defend: boolean;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface PlayerSimulationState {
  id: string;
  character: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: 1 | -1;
  frameId: number;
  frameTick: number;
  hp: number;
  mp: number;
  isGrounded: boolean;
  isDead: boolean;
  fallPoints: number;
  hitStun: number;
  invincibleTicks: number;
  lastHitByAttackId?: string;
}

export interface ProjectileSimulationState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: 1 | -1;
  frameId: number;
  frameTick: number;
  damage: number;
  ttl: number;
}

export interface WorldBoundary {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface GameSimulationState {
  tick: number;
  players: Record<string, PlayerSimulationState>;
  projectiles: ProjectileSimulationState[];
  boundary: WorldBoundary;
}
