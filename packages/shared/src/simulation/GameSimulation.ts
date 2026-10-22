import type { CharacterData } from '../types/character';
import type {
  GameSimulationState,
  InputState,
  PlayerSimulationState,
  ProjectileSimulationState,
  WorldBoundary,
} from '../types/simulation';
import { GRAVITY } from '../index';
import { InputBuffer } from '../input/InputBuffer';
import { updateMeleeCombat } from './combat';
import { createProjectile, updateProjectiles } from './projectiles';

export class GameSimulation {
  private state: GameSimulationState;
  private characterConfigs: Map<string, CharacterData> = new Map();
  private inputBuffers: Map<string, InputBuffer> = new Map();

  constructor(boundary: WorldBoundary = { minX: 60, maxX: 740, minZ: 310, maxZ: 435 }) {
    this.state = {
      tick: 0,
      players: {},
      projectiles: [],
      boundary,
    };
  }

  public registerCharacter(data: CharacterData): void {
    this.characterConfigs.set(data.name.toLowerCase(), data);
  }

  public addPlayer(
    id: string,
    characterName: string,
    spawnX = 400,
    spawnZ = 370,
    facing: 1 | -1 = 1
  ): PlayerSimulationState {
    const charData = this.characterConfigs.get(characterName.toLowerCase());
    const hp = charData ? charData.stats.hp : 500;
    const mp = charData ? charData.stats.mp : 500;

    const player: PlayerSimulationState = {
      id,
      character: characterName,
      x: spawnX,
      y: 0,
      z: spawnZ,
      vx: 0,
      vy: 0,
      vz: 0,
      facing,
      frameId: 0,
      frameTick: 0,
      hp,
      mp,
      isGrounded: true,
      isDead: false,
      fallPoints: 0,
      hitStun: 0,
      invincibleTicks: 0,
    };

    this.state.players[id] = player;
    this.inputBuffers.set(id, new InputBuffer());
    return player;
  }

  public getPlayer(id: string): PlayerSimulationState | undefined {
    return this.state.players[id];
  }

  public removePlayer(id: string): boolean {
    if (!this.state.players[id]) return false;

    delete this.state.players[id];
    this.inputBuffers.delete(id);
    this.state.projectiles = this.state.projectiles.filter(
      (projectile) => projectile.ownerId !== id
    );
    return true;
  }

  public getState(): GameSimulationState {
    return this.state;
  }

  public getInputBuffer(id: string): InputBuffer | undefined {
    return this.inputBuffers.get(id);
  }

  /**
   * Run one deterministic fixed simulation tick (30 TPS).
   */
  public update(inputs: Record<string, InputState>): void {
    this.state.tick++;

    // 1. Process Player Input & Actions
    for (const [id, player] of Object.entries(this.state.players)) {
      if (player.isDead) continue;

      const input = inputs[id] || {
        up: false,
        down: false,
        left: false,
        right: false,
        attack: false,
        jump: false,
        defend: false,
      };

      const buffer = this.inputBuffers.get(id);
      if (buffer) {
        buffer.push(this.state.tick, input);
      }

      this.updatePlayer(player, input, buffer);
    }

    // 2. Process Projectile Movement & Collisions
    updateProjectiles(this.state);

    // 3. Melee Hit Detection (Attacker Hitbox vs Victim Hurtbox)
    updateMeleeCombat(this.state, this.characterConfigs);
  }

  private updatePlayer(
    player: PlayerSimulationState,
    input: InputState,
    buffer: InputBuffer | undefined
  ): void {
    const char = this.characterConfigs.get(player.character.toLowerCase());
    if (!char) return;

    const currentFrame = char.frames[player.frameId] || char.frames[0];
    const currentState = currentFrame.state;

    // Decrement invincible ticks
    if (player.invincibleTicks > 0) {
      player.invincibleTicks--;
    }

    // Passive MP regeneration (+1 MP every 2 ticks, max 500)
    if (this.state.tick % 2 === 0 && player.mp < char.stats.mp) {
      player.mp = Math.min(char.stats.mp, player.mp + 1);
    }

    // Lying down & Getting up state handling
    if (currentState === 'lying') {
      player.vx = 0;
      player.vz = 0;
      if (player.frameTick >= currentFrame.wait) {
        // Transition to getting up
        this.transitionToFrame(player, 231);
        player.invincibleTicks = 10;
      }
      this.advanceFrameTicks(player, char);
      return;
    }

    // Check Combos from neutral/moving/defending states
    const canDoSpecial =
      (currentState === 'standing' ||
        currentState === 'walking' ||
        currentState === 'running' ||
        currentState === 'defending') &&
      player.isGrounded;

    if (canDoSpecial && buffer && player.mp >= 50) {
      // Defend + Forward + Attack: Fire Energy Blast projectile!
      if (buffer.checkCombo(player.facing, 'D_F_A')) {
        player.mp -= 50;
        this.transitionToFrame(player, 240);
        player.vx = player.facing * 4;
        player.vz = 0;

        // Spawn Projectile
        this.spawnProjectile(
          player.id,
          player.x + player.facing * 35,
          player.y + 35,
          player.z,
          player.facing * 11,
          player.facing,
          35,
          45
        );
        return;
      }

      // Defend + Up + Jump: Dragon Uppercut Leap
      if (buffer.checkCombo(player.facing, 'D_U_J')) {
        player.mp -= 50;
        this.transitionToFrame(player, 240);
        player.vy = char.stats.jumpHeight * 0.95;
        player.isGrounded = false;
        player.vx = player.facing * 5;
        return;
      }
    }

    // State Machine
    switch (currentState) {
      case 'standing':
        this.handleStandingState(player, input, buffer, char);
        break;

      case 'walking':
        this.handleWalkingState(player, input, buffer, char);
        break;

      case 'running':
        this.handleRunningState(player, input, char);
        break;

      case 'jumping':
        this.handleJumpingState(player, input);
        break;

      case 'defending':
        this.handleDefendingState(player, input);
        break;

      case 'attacking':
      case 'special':
        this.handleAttackingState(player, input, char);
        break;

      case 'injured':
        // Hit stun recovery
        player.vx *= 0.8;
        player.vz *= 0.8;
        break;

      case 'falling':
        // Knockdown flight
        break;

      default:
        break;
    }

    // Advance Frame Ticks
    this.advanceFrameTicks(player, char);

    // Physics: Velocities & Gravity
    player.x += player.vx;
    player.z += player.vz;

    if (!player.isGrounded) {
      player.y += player.vy;
      player.vy -= GRAVITY;

      if (player.y <= 0) {
        player.y = 0;
        player.vy = 0;
        player.isGrounded = true;

        if (player.frameId === 180 || player.frameId === 185 || currentState === 'falling') {
          // Knockdown impact: transition to lying state
          this.transitionToFrame(player, 230);
          player.invincibleTicks = 20;
          player.vx = 0;
          player.vz = 0;
        } else if (player.frameId === 81 || player.frameId === 90 || player.frameId === 215) {
          // Clean landing recovery
          this.transitionToFrame(player, 0);
          player.vx = 0;
          player.vz = 0;
        }
      }
    }

    // Arena Boundaries
    if (player.x < this.state.boundary.minX) {
      player.x = this.state.boundary.minX;
      player.vx = 0;
    } else if (player.x > this.state.boundary.maxX) {
      player.x = this.state.boundary.maxX;
      player.vx = 0;
    }

    if (player.z < this.state.boundary.minZ) {
      player.z = this.state.boundary.minZ;
      player.vz = 0;
    } else if (player.z > this.state.boundary.maxZ) {
      player.z = this.state.boundary.maxZ;
      player.vz = 0;
    }
  }

  private handleStandingState(
    player: PlayerSimulationState,
    input: InputState,
    buffer: InputBuffer | undefined,
    char: CharacterData
  ): void {
    player.vx = 0;
    player.vz = 0;

    if (input.defend) {
      this.transitionToFrame(player, 110);
      return;
    }

    if (input.jump) {
      this.initiateJump(player, char, 0);
      return;
    }

    if (input.attack) {
      this.transitionToFrame(player, 60);
      return;
    }

    if (buffer) {
      if (buffer.isDoubleTap('right')) {
        player.facing = 1;
        player.vx = char.stats.runSpeed;
        this.transitionToFrame(player, 9);
        return;
      }
      if (buffer.isDoubleTap('left')) {
        player.facing = -1;
        player.vx = -char.stats.runSpeed;
        this.transitionToFrame(player, 9);
        return;
      }
    }

    if (input.left || input.right || input.up || input.down) {
      if (input.left) player.facing = -1;
      else if (input.right) player.facing = 1;
      this.transitionToFrame(player, 5);
    }
  }

  private handleWalkingState(
    player: PlayerSimulationState,
    input: InputState,
    buffer: InputBuffer | undefined,
    char: CharacterData
  ): void {
    if (input.defend) {
      this.transitionToFrame(player, 110);
      player.vx = 0;
      player.vz = 0;
      return;
    }

    if (input.jump) {
      this.initiateJump(player, char, player.facing * char.stats.walkSpeed);
      return;
    }

    if (input.attack) {
      this.transitionToFrame(player, 60);
      player.vx = 0;
      player.vz = 0;
      return;
    }

    if (buffer) {
      if (buffer.isDoubleTap('right')) {
        player.facing = 1;
        player.vx = char.stats.runSpeed;
        this.transitionToFrame(player, 9);
        return;
      }
      if (buffer.isDoubleTap('left')) {
        player.facing = -1;
        player.vx = -char.stats.runSpeed;
        this.transitionToFrame(player, 9);
        return;
      }
    }

    const walkSpeed = char.stats.walkSpeed;
    const walkSpeedZ = walkSpeed * 0.55;

    let moveX = 0;
    let moveZ = 0;

    if (input.left) {
      moveX = -walkSpeed;
      player.facing = -1;
    } else if (input.right) {
      moveX = walkSpeed;
      player.facing = 1;
    }

    if (input.up) {
      moveZ = -walkSpeedZ;
    } else if (input.down) {
      moveZ = walkSpeedZ;
    }

    player.vx = moveX;
    player.vz = moveZ;

    if (moveX === 0 && moveZ === 0) {
      this.transitionToFrame(player, 0);
    }
  }

  private handleRunningState(
    player: PlayerSimulationState,
    input: InputState,
    char: CharacterData
  ): void {
    const runSpeed = char.stats.runSpeed;
    const runSpeedZ = runSpeed * 0.4;

    if (input.attack) {
      this.transitionToFrame(player, 102);
      player.vx = player.facing * (runSpeed * 0.85);
      return;
    }

    if (input.jump) {
      player.isGrounded = false;
      player.vy = char.stats.jumpHeight * 0.75;
      player.vx = player.facing * (runSpeed * 1.1);
      this.transitionToFrame(player, 81);
      return;
    }

    const forwardKey = player.facing === 1 ? input.right : input.left;
    const backKey = player.facing === 1 ? input.left : input.right;

    if (backKey || (!forwardKey && !input.up && !input.down)) {
      this.transitionToFrame(player, 0);
      player.vx = 0;
      player.vz = 0;
      return;
    }

    player.vx = player.facing * runSpeed;

    if (input.up) {
      player.vz = -runSpeedZ;
    } else if (input.down) {
      player.vz = runSpeedZ;
    } else {
      player.vz = 0;
    }
  }

  private handleJumpingState(player: PlayerSimulationState, input: InputState): void {
    if (input.attack && (player.frameId === 81 || player.frameId === 80)) {
      this.transitionToFrame(player, 90);
    }
  }

  private handleDefendingState(player: PlayerSimulationState, input: InputState): void {
    player.vx = 0;
    player.vz = 0;
    if (!input.defend) {
      this.transitionToFrame(player, 0);
    }
  }

  private handleAttackingState(
    player: PlayerSimulationState,
    input: InputState,
    _char: CharacterData
  ): void {
    if (input.attack && (player.frameId === 60 || player.frameId === 61)) {
      if (player.frameTick >= 1) {
        this.transitionToFrame(player, 62);
        return;
      }
    }
    if (input.attack && (player.frameId === 62 || player.frameId === 63)) {
      if (player.frameTick >= 1) {
        this.transitionToFrame(player, 64);
        return;
      }
    }

    player.vx *= 0.85;
    player.vz *= 0.85;
  }

  private initiateJump(player: PlayerSimulationState, char: CharacterData, horizontalSpeed: number): void {
    this.transitionToFrame(player, 80);
    player.isGrounded = false;
    player.vy = char.stats.jumpHeight;
    player.vx = horizontalSpeed;
  }

  private transitionToFrame(player: PlayerSimulationState, frameId: number): void {
    player.frameId = frameId;
    player.frameTick = 0;
  }

  private advanceFrameTicks(player: PlayerSimulationState, char: CharacterData): void {
    const frame = char.frames[player.frameId];
    if (!frame) return;

    player.frameTick++;
    if (player.frameTick >= frame.wait) {
      player.frameTick = 0;

      let nextFrame = frame.next;

      if (nextFrame === 999 || nextFrame === 0) {
        if (frame.state === 'walking') {
          nextFrame = 5;
        } else if (frame.state === 'running') {
          nextFrame = 9;
        } else if (frame.state === 'standing') {
          nextFrame = 0;
        } else if (frame.state === 'defending') {
          nextFrame = 110;
        } else {
          nextFrame = 0;
        }
      }

      if (!player.isGrounded && nextFrame === 0) {
        nextFrame = 81;
      }

      player.frameId = nextFrame;
    }
  }

  public spawnProjectile(
    ownerId: string,
    x: number,
    y: number,
    z: number,
    vx: number,
    facing: 1 | -1,
    damage = 35,
    _fall = 45
  ): ProjectileSimulationState {
    return createProjectile(this.state, ownerId, x, y, z, vx, facing, damage);
  }
}
