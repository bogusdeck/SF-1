import { Room, Client, CloseCode } from 'colyseus';
import {
  GameSimulation,
  MS_PER_TICK,
  davisData,
  dennisData,
  NetworkRoomState,
  NetworkPlayerState,
  NetworkProjectileState,
  type InputState,
} from '@lf-online/shared';

interface ClientInputMessage {
  seq: number;
  tick: number;
  input: InputState;
}

interface ClientReadyMessage {
  ready: boolean;
}

interface ClientSelectCharMessage {
  character: string;
}

interface ClientPingMessage {
  clientTime: number;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars 0/O, 1/I
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const SPAWN_SLOTS = [
  { x: 330, z: 360, facing: 1 as const, char: 'Davis' },
  { x: 470, z: 360, facing: -1 as const, char: 'Dennis' },
  { x: 260, z: 380, facing: 1 as const, char: 'Davis' },
  { x: 540, z: 380, facing: -1 as const, char: 'Dennis' },
];

export class LFRoom extends Room<{ state: NetworkRoomState; metadata: { roomCode: string } }> {
  maxClients = 4;
  private simulation!: GameSimulation;
  private clientInputs: Map<string, { seq: number; tick: number; input: InputState }> = new Map();
  private countdownTicks = 0;

  onCreate(options: { roomCode?: string; create?: boolean }) {
    this.setState(new NetworkRoomState());

    const roomCode = options.roomCode || generateRoomCode();
    this.state.roomCode = roomCode;
    this.setMetadata({ roomCode });

    // Initialize 2.5D deterministic simulation
    this.simulation = new GameSimulation({
      minX: 60,
      maxX: 740,
      minZ: 310,
      maxZ: 435,
    });
    this.simulation.registerCharacter(davisData);
    this.simulation.registerCharacter(dennisData);

    // Message Handlers
    this.onMessage('select_character', (client, message: ClientSelectCharMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (player && this.state.phase === 'lobby') {
        const charName = message.character === 'Dennis' ? 'Dennis' : 'Davis';
        player.character = charName;
      }
    });

    this.onMessage('ready', (client, message: ClientReadyMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (player && this.state.phase === 'lobby') {
        player.isReady = !!message.ready;
        this.checkReadyStart();
      }
    });

    this.onMessage('input', (client, message: ClientInputMessage) => {
      if (this.state.phase !== 'battle') return;
      this.clientInputs.set(client.sessionId, {
        seq: message.seq,
        tick: message.tick,
        input: message.input,
      });
    });

    this.onMessage('ping', (client, message: ClientPingMessage) => {
      client.send('pong', {
        clientTime: message.clientTime,
        serverTime: Date.now(),
      });
    });

    // Run fixed 30 TPS server simulation loop
    this.setSimulationInterval(() => this.updateSimulation(), MS_PER_TICK);
  }

  onJoin(client: Client, options: { name?: string; character?: string }) {
    console.log(`Client joined room ${this.state.roomCode}: ${client.sessionId}`);

    // Assign slot (0..3)
    const existingSlots = new Set<number>();
    this.state.players.forEach((p: NetworkPlayerState) => existingSlots.add(p.slot));
    let assignedSlot = 0;
    for (let s = 0; s < 4; s++) {
      if (!existingSlots.has(s)) {
        assignedSlot = s;
        break;
      }
    }

    const spawn = SPAWN_SLOTS[assignedSlot] || SPAWN_SLOTS[0];
    const initialChar = options.character || spawn.char;

    const pState = new NetworkPlayerState();
    pState.id = client.sessionId;
    pState.name = options.name || `Player ${assignedSlot + 1}`;
    pState.character = initialChar;
    pState.slot = assignedSlot;
    pState.x = spawn.x;
    pState.y = 0;
    pState.z = spawn.z;
    pState.facing = spawn.facing;
    pState.hp = 500;
    pState.mp = 500;
    pState.isGrounded = true;
    pState.isReady = false;
    pState.connected = true;

    this.state.players.set(client.sessionId, pState);

    // Add to simulation
    this.simulation.addPlayer(
      client.sessionId,
      initialChar,
      spawn.x,
      spawn.z,
      spawn.facing
    );

    this.clientInputs.set(client.sessionId, {
      seq: 0,
      tick: 0,
      input: {
        up: false,
        down: false,
        left: false,
        right: false,
        attack: false,
        jump: false,
        defend: false,
      },
    });
  }

  async onLeave(client: Client, code?: number) {
    console.log(`Client left room ${this.state.roomCode}: ${client.sessionId}, code=${code}`);
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (code === CloseCode.CONSENTED || code === CloseCode.NORMAL_CLOSURE) {
      // Intentional leave: remove from state & simulation
      this.state.players.delete(client.sessionId);
      this.clientInputs.delete(client.sessionId);
      return;
    }

    // Graceful disconnect: player becomes idle, allow 30 seconds reconnection
    player.connected = false;
    try {
      await this.allowReconnection(client, 30);
      player.connected = true;
      console.log(`Client reconnected: ${client.sessionId}`);
    } catch {
      console.log(`Reconnection window expired for client: ${client.sessionId}`);
      this.state.players.delete(client.sessionId);
      this.clientInputs.delete(client.sessionId);
    }
  }

  private checkReadyStart() {
    let allReady = true;
    let count = 0;

    this.state.players.forEach((p: NetworkPlayerState) => {
      count++;
      if (!p.isReady) allReady = false;
    });

    if (count >= 1 && allReady) {
      this.state.phase = 'countdown';
      this.state.countdown = 3;
      this.countdownTicks = 90; // 3 seconds at 30 TPS
    }
  }

  private updateSimulation() {
    this.state.tick++;

    if (this.state.phase === 'countdown') {
      this.countdownTicks--;
      this.state.countdown = Math.ceil(this.countdownTicks / 30);
      if (this.countdownTicks <= 0) {
        this.state.phase = 'battle';
      }
      return;
    }

    if (this.state.phase !== 'battle') return;

    // 1. Gather latest inputs from clients
    const inputsMap: Record<string, InputState> = {};
    const defaultInput: InputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      attack: false,
      jump: false,
      defend: false,
    };

    this.state.players.forEach((player: NetworkPlayerState, id: string) => {
      const clientEntry = this.clientInputs.get(id);
      inputsMap[id] = player.connected && clientEntry ? clientEntry.input : defaultInput;
      if (clientEntry) {
        player.lastProcessedInput = clientEntry.seq;
      }
    });

    // 2. Step the deterministic simulation
    this.simulation.update(inputsMap);

    // 3. Sync simulation state to Colyseus Schema
    const simState = this.simulation.getState();

    for (const [id, simPlayer] of Object.entries(simState.players)) {
      const netPlayer = this.state.players.get(id);
      if (!netPlayer) continue;

      netPlayer.x = simPlayer.x;
      netPlayer.y = simPlayer.y;
      netPlayer.z = simPlayer.z;
      netPlayer.vx = simPlayer.vx;
      netPlayer.vy = simPlayer.vy;
      netPlayer.vz = simPlayer.vz;
      netPlayer.facing = simPlayer.facing;
      netPlayer.frameId = simPlayer.frameId;
      netPlayer.frameTick = simPlayer.frameTick;
      netPlayer.hp = simPlayer.hp;
      netPlayer.mp = simPlayer.mp;
      netPlayer.isGrounded = simPlayer.isGrounded;
      netPlayer.isDead = simPlayer.isDead;
    }

    // Sync projectiles
    const activeIds = new Set<string>();
    for (const p of simState.projectiles) {
      activeIds.add(p.id);
      let netProj = this.state.projectiles.get(p.id);
      if (!netProj) {
        netProj = new NetworkProjectileState();
        netProj.id = p.id;
        netProj.ownerId = p.ownerId;
        this.state.projectiles.set(p.id, netProj);
      }
      netProj.x = p.x;
      netProj.y = p.y;
      netProj.z = p.z;
      netProj.vx = p.vx;
      netProj.facing = p.facing;
      netProj.damage = p.damage;
    }

    // Delete expired projectiles
    const toDelete: string[] = [];
    this.state.projectiles.forEach((_p: NetworkProjectileState, id: string) => {
      if (!activeIds.has(id)) {
        toDelete.push(id);
      }
    });
    for (const id of toDelete) {
      this.state.projectiles.delete(id);
    }
  }
}
