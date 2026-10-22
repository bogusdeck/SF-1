import { Client, Room } from '@colyseus/sdk';
import { NetworkRoomState, type InputState } from '@lf-online/shared';

export interface PingData {
  pingMs: number;
}

export class NetworkManager {
  private static instance: NetworkManager;
  private client: Client;
  private activeRoom: Room<NetworkRoomState> | null = null;
  private pingInterval: number | null = null;
  private lastPingSent = 0;
  private currentPing = 0;

  private constructor() {
    const defaultHost =
      typeof window !== 'undefined' && window.location.hostname
        ? window.location.hostname
        : 'localhost';
    const defaultProtocol =
      typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? 'https:'
        : 'http:';
    const serverUrl =
      import.meta.env.VITE_SERVER_URL || `${defaultProtocol}//${defaultHost}:2567`;

    console.log(`Connecting Colyseus client to ${serverUrl}`);
    this.client = new Client(serverUrl);
  }

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  public async createRoom(
    name = 'Player 1',
    character = 'Davis',
    roomCode?: string
  ): Promise<Room<any, NetworkRoomState>> {
    const room = await this.client.create<any, NetworkRoomState>(
      'game_room',
      {
        create: true,
        name,
        character,
        roomCode,
      },
      NetworkRoomState
    );
    this.setupRoom(room as any);
    return room as any;
  }

  public async joinRoomByCode(
    roomCode: string,
    name = 'Player 2',
    character = 'Dennis'
  ): Promise<Room<any, NetworkRoomState>> {
    const room = await this.client.joinOrCreate<any, NetworkRoomState>(
      'game_room',
      {
        roomCode: roomCode.toUpperCase().trim(),
        name,
        character,
      },
      NetworkRoomState
    );
    this.setupRoom(room as any);
    return room as any;
  }

  private setupRoom(room: Room<NetworkRoomState>) {
    this.activeRoom = room;

    room.onMessage('pong', (data: { clientTime: number; serverTime: number }) => {
      const now = Date.now();
      const rtt = Math.max(1, now - data.clientTime);
      this.currentPing = Math.round(rtt / 2);
    });

    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
    }

    this.pingInterval = window.setInterval(() => {
      if (this.activeRoom) {
        this.lastPingSent = Date.now();
        this.activeRoom.send('ping', { clientTime: this.lastPingSent });
      }
    }, 1500);

    room.onLeave((_code) => {
      if (this.pingInterval) {
        window.clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      this.activeRoom = null;
    });
  }

  public getRoom(): Room<NetworkRoomState> | null {
    return this.activeRoom;
  }

  public getPing(): number {
    return this.currentPing;
  }

  public selectCharacter(character: 'Davis' | 'Dennis'): void {
    if (this.activeRoom) {
      this.activeRoom.send('select_character', { character });
    }
  }

  public setReady(ready: boolean): void {
    if (this.activeRoom) {
      this.activeRoom.send('ready', { ready });
    }
  }

  public sendInput(seq: number, tick: number, input: InputState): void {
    if (this.activeRoom) {
      this.activeRoom.send('input', { seq, tick, input });
    }
  }

  public leave(): void {
    if (this.activeRoom) {
      this.activeRoom.leave(true);
      this.activeRoom = null;
    }
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
