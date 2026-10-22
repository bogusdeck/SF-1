import Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';
import {
  TICK_RATE,
  MS_PER_TICK,
  type CharacterData,
  type InputState,
  type NetworkRoomState,
  type NetworkPlayerState,
  type NetworkProjectileState,
} from '@lf-online/shared';
import { TouchControls } from '../ui/TouchControls';
import { loadKeyMapping } from '../config/keyboardConfig';

interface RemotePlayerVisual {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  charData: CharacterData;
  atlasKey: string;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetFacing: number;
  frameId: number;
  hp: number;
  mp: number;
  name: string;
  connected: boolean;
}

interface PendingInput {
  seq: number;
  input: InputState;
}

export class OnlineGameScene extends Phaser.Scene {
  private network!: NetworkManager;
  private davisData!: CharacterData;
  private dennisData!: CharacterData;

  // Local Player
  private localSessionId = '';
  private localSprite!: Phaser.GameObjects.Sprite;
  private localShadow!: Phaser.GameObjects.Image;
  private localCharData!: CharacterData;
  private localAtlasKey = 'davis_atlas';

  // Client-Side Prediction State
  private localX = 400;
  private localY = 0;
  private localZ = 370;
  private localVx = 0;
  private localVy = 0;
  private localVz = 0;
  private localFacing: 1 | -1 = 1;
  private localFrameId = 0;
  private localHp = 500;
  private localMp = 500;
  private localInputSeq = 0;
  private pendingInputs: PendingInput[] = [];

  // Remote Players
  private remotePlayers: Map<string, RemotePlayerVisual> = new Map();

  // Projectiles
  private projectileSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private projectileShadows: Map<string, Phaser.GameObjects.Image> = new Map();

  // Visuals & HUD
  private boxGraphics!: Phaser.GameObjects.Graphics;
  private pingText!: Phaser.GameObjects.Text;
  private disconnectNotice!: Phaser.GameObjects.Text;

  // P1 HUD
  private p1HpBarFill!: Phaser.GameObjects.Graphics;
  private p1MpBarFill!: Phaser.GameObjects.Graphics;
  private p1HpText!: Phaser.GameObjects.Text;
  private p1MpText!: Phaser.GameObjects.Text;
  private p1NameText!: Phaser.GameObjects.Text;
  private p1Avatar!: Phaser.GameObjects.Sprite;

  // P2 HUD
  private p2HpBarFill!: Phaser.GameObjects.Graphics;
  private p2MpBarFill!: Phaser.GameObjects.Graphics;
  private p2HpText!: Phaser.GameObjects.Text;
  private p2MpText!: Phaser.GameObjects.Text;
  private p2NameText!: Phaser.GameObjects.Text;
  private p2Avatar!: Phaser.GameObjects.Sprite;

  // Inputs
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyB!: Phaser.Input.Keyboard.Key;
  private showDebugBoxes = true;

  // Touch Controls Overlay
  private touchControls!: TouchControls;

  // Simulation accumulator
  private tickAccumulator = 0;

  constructor() {
    super('OnlineGameScene');
  }

  preload() {
    this.load.atlas(
      'davis_atlas',
      '/assets/characters/davis_atlas.png',
      '/assets/characters/davis_atlas.json'
    );
    this.load.json('davis_data', '/assets/characters/davis.json');

    this.load.atlas(
      'dennis_atlas',
      '/assets/characters/dennis_atlas.png',
      '/assets/characters/dennis_atlas.json'
    );
    this.load.json('dennis_data', '/assets/characters/dennis.json');

    this.load.image('shadow', '/assets/shadow.png');
    this.load.image('energy_ball', '/assets/energy_ball.png');
    this.load.image('bg_hkc_1', '/assets/bg/hkc/back1.png');
    this.load.image('bg_hkc_2', '/assets/bg/hkc/back2.png');
  }

  create() {
    this.network = NetworkManager.getInstance();
    const room = this.network.getRoom();

    const urlParams = new URLSearchParams(window.location.search);
    const mockOnline = urlParams.get('mock_online') === '1' || urlParams.get('scene') === 'online';

    if (!room && !mockOnline) {
      console.warn('No active network room found, redirecting to LobbyScene');
      this.scene.start('LobbyScene');
      return;
    }

    this.localSessionId = room ? room.sessionId : 'local_p1';
    this.davisData = this.cache.json.get('davis_data') as CharacterData;
    this.dennisData = this.cache.json.get('dennis_data') as CharacterData;

    // 1. Setup Background Environment
    this.setupStage();

    // 2. Setup HUD (HP/MP, Avatar, Ping, Disconnect warning)
    this.setupHUD();

    // 3. Setup Controls
    this.setupControls();

    // 4. Initialize Local Visuals
    this.localShadow = this.add.image(340, 370, 'shadow');
    this.localShadow.setOrigin(0.5, 0.5);
    this.localShadow.setAlpha(0.65);
    this.localShadow.setDepth(200);

    this.localSprite = this.add.sprite(340, 370, 'davis_atlas', '0');
    this.localSprite.setScale(2);
    this.localX = 340;
    this.localZ = 370;
    this.localFacing = 1;

    this.boxGraphics = this.add.graphics();
    this.boxGraphics.setDepth(1500);

    // 5. Attach State Synchronization Listeners
    if (room) {
      this.attachStateSync(room);
    } else {
      // Mock remote opponent Dennis in online match demo
      const remShadow = this.add.image(470, 372, 'shadow');
      remShadow.setOrigin(0.5, 0.5);
      remShadow.setAlpha(0.65);
      remShadow.setDepth(200);

      const remSprite = this.add.sprite(470, 370, 'dennis_atlas', '0');
      remSprite.setScale(2);
      remSprite.setDepth(370);

      this.remotePlayers.set('remote_p2', {
        sprite: remSprite,
        shadow: remShadow,
        charData: this.dennisData,
        atlasKey: 'dennis_atlas',
        targetX: 470,
        targetY: 0,
        targetZ: 370,
        targetFacing: -1,
        frameId: 0,
        hp: 500,
        mp: 500,
        name: 'Player 2 (Online)',
        connected: true,
      });
    }

    // 6. Setup Mobile Touch Controls Overlay
    this.touchControls = new TouchControls(this);
  }

  private setupStage() {
    const bgStadium = this.add.image(400, 100, 'bg_hkc_1');
    bgStadium.setDisplaySize(800, 160);
    bgStadium.setDepth(10);

    const bgCrowd = this.add.image(400, 200, 'bg_hkc_2');
    bgCrowd.setDisplaySize(800, 120);
    bgCrowd.setDepth(20);

    const floor = this.add.graphics();
    floor.setDepth(30);

    floor.fillStyle(0x1a1c22, 1);
    floor.fillRect(0, 240, 800, 210);

    floor.fillStyle(0x272b33, 1);
    floor.fillRect(0, 280, 800, 170);

    floor.lineStyle(2, 0x4a5360, 0.9);
    floor.strokeRect(40, 290, 720, 150);

    floor.lineStyle(1.5, 0x3d4754, 0.7);
    floor.strokeCircle(400, 365, 45);
    floor.lineStyle(1, 0x373e48, 0.6);
    floor.lineBetween(40, 365, 760, 365);
    floor.lineBetween(400, 290, 400, 440);
  }

  private setupHUD() {
    const hudContainer = this.add.container(0, 0);
    hudContainer.setDepth(2000);

    // ==========================================
    // Player 1 (Local Player) Status Panel
    // ==========================================
    const p1PanelBg = this.add.graphics();
    p1PanelBg.fillStyle(0x121418, 0.92);
    p1PanelBg.fillRoundedRect(12, 10, 255, 68, 6);
    p1PanelBg.lineStyle(1.5, 0x3d4552, 0.85);
    p1PanelBg.strokeRoundedRect(12, 10, 255, 68, 6);
    hudContainer.add(p1PanelBg);

    const p1AvatarBox = this.add.graphics();
    p1AvatarBox.fillStyle(0x1e2430, 1);
    p1AvatarBox.fillRoundedRect(18, 16, 52, 54, 4);
    p1AvatarBox.lineStyle(1, 0x5a687d, 0.8);
    p1AvatarBox.strokeRoundedRect(18, 16, 52, 54, 4);
    hudContainer.add(p1AvatarBox);

    this.p1Avatar = this.add.sprite(44, 43, 'davis_atlas', '0');
    this.p1Avatar.setScale(0.9);
    hudContainer.add(this.p1Avatar);

    this.p1NameText = this.add.text(78, 16, 'YOU (DAVIS)', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#4fc3f7',
      fontStyle: 'bold',
    });
    hudContainer.add(this.p1NameText);

    // HP Bar
    const p1HpBg = this.add.graphics();
    p1HpBg.fillStyle(0x3a1010, 1);
    p1HpBg.fillRoundedRect(78, 32, 180, 14, 3);
    hudContainer.add(p1HpBg);

    this.p1HpBarFill = this.add.graphics();
    hudContainer.add(this.p1HpBarFill);

    this.p1HpText = this.add.text(82, 33, 'HP 500/500', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    hudContainer.add(this.p1HpText);

    // MP Bar
    const p1MpBg = this.add.graphics();
    p1MpBg.fillStyle(0x10203a, 1);
    p1MpBg.fillRoundedRect(78, 50, 180, 14, 3);
    hudContainer.add(p1MpBg);

    this.p1MpBarFill = this.add.graphics();
    hudContainer.add(this.p1MpBarFill);

    this.p1MpText = this.add.text(82, 51, 'MP 500/500', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    hudContainer.add(this.p1MpText);

    // ==========================================
    // Player 2 (Remote Opponent) Status Panel
    // ==========================================
    const p2PanelBg = this.add.graphics();
    p2PanelBg.fillStyle(0x121418, 0.92);
    p2PanelBg.fillRoundedRect(533, 10, 255, 68, 6);
    p2PanelBg.lineStyle(1.5, 0x3d4552, 0.85);
    p2PanelBg.strokeRoundedRect(533, 10, 255, 68, 6);
    hudContainer.add(p2PanelBg);

    const p2AvatarBox = this.add.graphics();
    p2AvatarBox.fillStyle(0x1e2430, 1);
    p2AvatarBox.fillRoundedRect(730, 16, 52, 54, 4);
    p2AvatarBox.lineStyle(1, 0x5a687d, 0.8);
    p2AvatarBox.strokeRoundedRect(730, 16, 52, 54, 4);
    hudContainer.add(p2AvatarBox);

    this.p2Avatar = this.add.sprite(756, 43, 'dennis_atlas', '0');
    this.p2Avatar.setScale(0.9);
    this.p2Avatar.setFlipX(true);
    hudContainer.add(this.p2Avatar);

    this.p2NameText = this.add.text(542, 16, 'OPPONENT', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#81c784',
      fontStyle: 'bold',
    });
    hudContainer.add(this.p2NameText);

    // HP Bar
    const p2HpBg = this.add.graphics();
    p2HpBg.fillStyle(0x3a1010, 1);
    p2HpBg.fillRoundedRect(542, 32, 180, 14, 3);
    hudContainer.add(p2HpBg);

    this.p2HpBarFill = this.add.graphics();
    hudContainer.add(this.p2HpBarFill);

    this.p2HpText = this.add.text(546, 33, 'HP 500/500', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    hudContainer.add(this.p2HpText);

    // MP Bar
    const p2MpBg = this.add.graphics();
    p2MpBg.fillStyle(0x10203a, 1);
    p2MpBg.fillRoundedRect(542, 50, 180, 14, 3);
    hudContainer.add(p2MpBg);

    this.p2MpBarFill = this.add.graphics();
    hudContainer.add(this.p2MpBarFill);

    this.p2MpText = this.add.text(546, 51, 'MP 500/500', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    hudContainer.add(this.p2MpText);

    // Center Ping Indicator
    const pingBox = this.add.graphics();
    pingBox.fillStyle(0x121418, 0.9);
    pingBox.fillRoundedRect(355, 10, 90, 28, 4);
    pingBox.lineStyle(1, 0x3d4552, 0.8);
    pingBox.strokeRoundedRect(355, 10, 90, 28, 4);
    hudContainer.add(pingBox);

    this.pingText = this.add.text(400, 24, 'PING: --ms', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#28a745',
      fontStyle: 'bold',
    });
    this.pingText.setOrigin(0.5, 0.5);
    hudContainer.add(this.pingText);

    // Disconnect Notice Banner
    this.disconnectNotice = this.add.text(400, 95, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#e06c75',
      fontStyle: 'bold',
      backgroundColor: '#1c1f24',
      padding: { x: 8, y: 4 },
    });
    this.disconnectNotice.setOrigin(0.5, 0.5);
    this.disconnectNotice.setVisible(false);
    hudContainer.add(this.disconnectNotice);

    // Controls banner at bottom
    const controlsBg = this.add.graphics();
    controlsBg.fillStyle(0x121418, 0.93);
    controlsBg.fillRoundedRect(14, 412, 772, 32, 4);
    controlsBg.lineStyle(1, 0x3d4552, 0.8);
    controlsBg.strokeRoundedRect(14, 412, 772, 32, 4);
    hudContainer.add(controlsBg);

    const controlsBanner = this.add.text(
      20,
      418,
      'ARROWS: 2.5D Move | A: Attack | S: Jump | D: Defend | D+F+A: Dragon Blast | B: Hitboxes',
      {
        fontFamily: 'monospace',
        fontSize: '9.5px',
        color: '#e5c07b',
        fontStyle: 'bold',
      }
    );
    hudContainer.add(controlsBanner);

    // Touch Controls Toggle Button on HUD
    const touchBtn = this.add.text(400, 75, '🎮 TOUCH CONTROLS', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#61afef',
      backgroundColor: '#1b1f27',
      padding: { x: 8, y: 3 },
    });
    touchBtn.setOrigin(0.5, 0.5);
    touchBtn.setInteractive({ useHandCursor: true });
    touchBtn.on('pointerdown', () => {
      const isVisible = this.touchControls.toggleVisible();
      touchBtn.setColor(isVisible ? '#98c379' : '#61afef');
    });
    hudContainer.add(touchBtn);
  }

  private setupControls() {
    if (!this.input.keyboard) return;

    const keyMap = loadKeyMapping();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(keyMap.attack);
    this.keyS = this.input.keyboard.addKey(keyMap.jump);
    this.keyD = this.input.keyboard.addKey(keyMap.defend);
    this.keyB = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

    this.keyB.on('down', () => {
      this.showDebugBoxes = !this.showDebugBoxes;
      if (!this.showDebugBoxes) {
        this.boxGraphics.clear();
      }
    });
  }

  private attachStateSync(room: ReturnType<NetworkManager['getRoom']>) {
    if (!room) return;

    room.onStateChange((state: NetworkRoomState) => {
      // 1. Process Local Player Reconciliation
      const localNetPlayer = state.players.get(this.localSessionId);
      if (localNetPlayer) {
        this.reconcileLocalPlayer(localNetPlayer);
      }

      // 2. Process Remote Players
      state.players.forEach((player: NetworkPlayerState, id: string) => {
        if (id === this.localSessionId) return;

        let remote = this.remotePlayers.get(id);
        if (!remote) {
          const charName = player.character || 'Dennis';
          const atlasKey =
            charName.toLowerCase() === 'dennis' ? 'dennis_atlas' : 'davis_atlas';
          const charData =
            charName.toLowerCase() === 'dennis' ? this.dennisData : this.davisData;

          const shadow = this.add.image(player.x, player.z + 2, 'shadow');
          shadow.setOrigin(0.5, 0.5);
          shadow.setAlpha(0.65);
          shadow.setDepth(200);

          const sprite = this.add.sprite(player.x, player.z - player.y, atlasKey, '0');
          sprite.setScale(2);

          remote = {
            sprite,
            shadow,
            charData,
            atlasKey,
            targetX: player.x,
            targetY: player.y,
            targetZ: player.z,
            targetFacing: player.facing,
            frameId: player.frameId,
            hp: player.hp,
            mp: player.mp,
            name: player.name,
            connected: player.connected,
          };
          this.remotePlayers.set(id, remote);
        }

        remote.targetX = player.x;
        remote.targetY = player.y;
        remote.targetZ = player.z;
        remote.targetFacing = player.facing;
        remote.frameId = player.frameId;
        remote.hp = player.hp;
        remote.mp = player.mp;
        remote.connected = player.connected;
      });

      // 3. Process Projectiles
      this.syncProjectiles(state.projectiles);
    });
  }

  private collectInput(): InputState {
    const emptyInput: InputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      attack: false,
      jump: false,
      defend: false,
    };

    const touchInput = this.touchControls ? this.touchControls.getInput() : emptyInput;

    return {
      up: (this.cursors ? this.cursors.up.isDown : false) || touchInput.up,
      down: (this.cursors ? this.cursors.down.isDown : false) || touchInput.down,
      left: (this.cursors ? this.cursors.left.isDown : false) || touchInput.left,
      right: (this.cursors ? this.cursors.right.isDown : false) || touchInput.right,
      attack: (this.keyA ? this.keyA.isDown : false) || touchInput.attack,
      jump: (this.keyS ? this.keyS.isDown : false) || touchInput.jump,
      defend: (this.keyD ? this.keyD.isDown : false) || touchInput.defend,
    };
  }

  update(_time: number, delta: number) {
    // Fixed 30 TPS simulation accumulator
    this.tickAccumulator += delta;
    while (this.tickAccumulator >= MS_PER_TICK) {
      this.tickAccumulator -= MS_PER_TICK;

      const input = this.collectInput();
      this.localInputSeq++;

      // Send to authoritative server
      this.network.sendInput(this.localInputSeq, 0, input);

      // Store in prediction buffer
      this.pendingInputs.push({ seq: this.localInputSeq, input });

      // Client-Side Prediction: apply immediate movement
      this.predictLocalStep(input);
    }

    // Render local, interpolated remotes, and projectiles
    this.renderScene();
  }

  private predictLocalStep(input: InputState) {
    const walkSpeed = 3.5;
    const walkSpeedZ = 2.0;

    let moveX = 0;
    let moveZ = 0;

    if (input.left) {
      moveX = -walkSpeed;
      this.localFacing = -1;
    } else if (input.right) {
      moveX = walkSpeed;
      this.localFacing = 1;
    }

    if (input.up) {
      moveZ = -walkSpeedZ;
    } else if (input.down) {
      moveZ = walkSpeedZ;
    }

    this.localVx = moveX;
    this.localVz = moveZ;

    this.localX += this.localVx;
    this.localZ += this.localVz;

    // Arena boundary clamp
    this.localX = Math.max(60, Math.min(740, this.localX));
    this.localZ = Math.max(310, Math.min(435, this.localZ));
  }

  private reconcileLocalPlayer(serverPlayer: NetworkPlayerState) {
    this.localHp = serverPlayer.hp;
    this.localMp = serverPlayer.mp;
    this.localFrameId = serverPlayer.frameId;

    // Discard acknowledged inputs
    this.pendingInputs = this.pendingInputs.filter(
      (entry) => entry.seq > serverPlayer.lastProcessedInput
    );

    // If drift is significant (> 3px), reconcile to authoritative server state
    const dx = Math.abs(this.localX - serverPlayer.x);
    const dz = Math.abs(this.localZ - serverPlayer.z);

    if (dx > 3 || dz > 3) {
      this.localX = serverPlayer.x;
      this.localZ = serverPlayer.z;
      this.localY = serverPlayer.y;

      // Replay pending inputs
      for (const pending of this.pendingInputs) {
        this.predictLocalStep(pending.input);
      }
    }
  }

  private renderScene() {
    // 1. Render Local Player
    const localScreenX = this.localX;
    const localScreenY = this.localZ - this.localY;

    this.localSprite.setPosition(localScreenX, localScreenY);
    this.localSprite.setScale(this.localFacing * 2, 2);
    this.localSprite.setDepth(this.localZ);

    this.localShadow.setPosition(this.localX, this.localZ + 2);
    const localHeightRatio = Math.max(0, 1 - this.localY / 150);
    this.localShadow.setScale(1.8 * localHeightRatio, 1.2 * localHeightRatio);
    this.localShadow.setAlpha(0.65 * localHeightRatio);

    const localCharData = this.localCharData || this.davisData;
    const localFrame =
      localCharData.frames[this.localFrameId] || localCharData.frames[0];
    const pic = localFrame.pic.toString();
    if (this.textures.get(this.localAtlasKey).has(pic)) {
      this.localSprite.setFrame(pic);
    }
    const lcx = localFrame.centerx !== undefined ? localFrame.centerx : 39;
    const lcy = localFrame.centery !== undefined ? localFrame.centery : 79;
    this.localSprite.setOrigin(lcx / 79, lcy / 79);

    // 2. Render & Interpolate Remote Players
    let firstRemote: RemotePlayerVisual | null = null;

    for (const remote of this.remotePlayers.values()) {
      if (!firstRemote) firstRemote = remote;

      // Smooth Lerp interpolation (0.35 factor)
      remote.targetX = Phaser.Math.Linear(remote.sprite.x, remote.targetX, 0.35);
      remote.targetZ = Phaser.Math.Linear(remote.shadow.y - 2, remote.targetZ, 0.35);

      const remScreenX = remote.targetX;
      const remScreenY = remote.targetZ - remote.targetY;

      remote.sprite.setPosition(remScreenX, remScreenY);
      remote.sprite.setScale(remote.targetFacing * 2, 2);
      remote.sprite.setDepth(remote.targetZ);

      remote.shadow.setPosition(remote.targetX, remote.targetZ + 2);

      const rFrame =
        remote.charData.frames[remote.frameId] || remote.charData.frames[0];
      const rpic = rFrame.pic.toString();
      if (this.textures.get(remote.atlasKey).has(rpic)) {
        remote.sprite.setFrame(rpic);
      }
      const rcx = rFrame.centerx !== undefined ? rFrame.centerx : 39;
      const rcy = rFrame.centery !== undefined ? rFrame.centery : 79;
      remote.sprite.setOrigin(rcx / 79, rcy / 79);
    }

    // 3. Update HUD Bars & Telemetry
    this.updateHUD(firstRemote);

    // 4. Update Ping
    const ping = this.network.getPing();
    this.pingText.setText(`PING: ${ping}ms`);
    if (ping < 60) this.pingText.setColor('#28a745');
    else if (ping < 120) this.pingText.setColor('#f0ad4e');
    else this.pingText.setColor('#e06c75');

    // 5. Hitbox / Hurtbox Visualizer
    if (this.showDebugBoxes) {
      this.drawDebugBoxes();
    }
  }

  private updateHUD(remote: RemotePlayerVisual | null) {
    const barWidth = 178;
    const barHeight = 12;

    // Local Player HP/MP
    const lHpRatio = Math.max(0, Math.min(1, this.localHp / 500));
    const lMpRatio = Math.max(0, Math.min(1, this.localMp / 500));

    this.p1HpBarFill.clear();
    this.p1HpBarFill.fillStyle(0xd9534f, 1);
    this.p1HpBarFill.fillRect(79, 33, barWidth * lHpRatio, barHeight);

    this.p1MpBarFill.clear();
    this.p1MpBarFill.fillStyle(0x0275d8, 1);
    this.p1MpBarFill.fillRect(79, 51, barWidth * lMpRatio, barHeight);

    this.p1HpText.setText(`HP ${Math.round(this.localHp)}/500`);
    this.p1MpText.setText(`MP ${Math.round(this.localMp)}/500`);

    // Remote Player HP/MP
    if (remote) {
      const rHpRatio = Math.max(0, Math.min(1, remote.hp / 500));
      const rMpRatio = Math.max(0, Math.min(1, remote.mp / 500));

      this.p2HpBarFill.clear();
      this.p2HpBarFill.fillStyle(0xd9534f, 1);
      this.p2HpBarFill.fillRect(543, 33, barWidth * rHpRatio, barHeight);

      this.p2MpBarFill.clear();
      this.p2MpBarFill.fillStyle(0x0275d8, 1);
      this.p2MpBarFill.fillRect(543, 51, barWidth * rMpRatio, barHeight);

      this.p2HpText.setText(`HP ${Math.round(remote.hp)}/500`);
      this.p2MpText.setText(`MP ${Math.round(remote.mp)}/500`);
      this.p2NameText.setText(remote.name.toUpperCase());

      // Disconnect handling
      if (!remote.connected) {
        this.disconnectNotice.setText(`⚠️ ${remote.name} disconnected! Waiting 30s to reconnect...`);
        this.disconnectNotice.setVisible(true);
      } else {
        this.disconnectNotice.setVisible(false);
      }
    }
  }

  private syncProjectiles(projectiles: Map<string, NetworkProjectileState> | any) {
    const activeIds = new Set<string>();

    projectiles.forEach((proj: NetworkProjectileState) => {
      activeIds.add(proj.id);

      let sprite = this.projectileSprites.get(proj.id);
      let shadow = this.projectileShadows.get(proj.id);

      if (!sprite) {
        sprite = this.add.image(proj.x, proj.z - proj.y, 'energy_ball');
        sprite.setScale(1.5);
        this.projectileSprites.set(proj.id, sprite);

        shadow = this.add.image(proj.x, proj.z + 2, 'shadow');
        shadow.setScale(0.8, 0.5);
        shadow.setAlpha(0.5);
        shadow.setDepth(200);
        this.projectileShadows.set(proj.id, shadow);
      }

      sprite.setPosition(proj.x, proj.z - proj.y);
      sprite.setDepth(proj.z + 10);
      if (shadow) {
        shadow.setPosition(proj.x, proj.z + 2);
      }
    });

    for (const [id, sprite] of this.projectileSprites.entries()) {
      if (!activeIds.has(id)) {
        sprite.destroy();
        this.projectileSprites.delete(id);

        const shadow = this.projectileShadows.get(id);
        if (shadow) {
          shadow.destroy();
          this.projectileShadows.delete(id);
        }
      }
    }
  }

  private drawDebugBoxes() {
    this.boxGraphics.clear();

    // Local hurtbox in Green
    const charData = this.localCharData || this.davisData;
    const frame = charData.frames[this.localFrameId] || charData.frames[0];
    const screenX = this.localX;
    const screenY = this.localZ - this.localY;
    const cx = (frame.centerx ?? 39) * 2;
    const cy = (frame.centery ?? 79) * 2;

    if (frame.bdy) {
      for (const b of frame.bdy) {
        const bx =
          this.localFacing === 1
            ? screenX - cx + b.x * 2
            : screenX + cx - (b.x + b.w) * 2;
        const by = screenY - cy + b.y * 2;
        this.boxGraphics.fillStyle(0x28a745, 0.25);
        this.boxGraphics.fillRect(bx, by, b.w * 2, b.h * 2);
        this.boxGraphics.lineStyle(1.5, 0x28a745, 0.95);
        this.boxGraphics.strokeRect(bx, by, b.w * 2, b.h * 2);
      }
    }

    // Remote hurtboxes
    for (const remote of this.remotePlayers.values()) {
      const rFrame =
        remote.charData.frames[remote.frameId] || remote.charData.frames[0];
      const rx = remote.sprite.x;
      const ry = remote.sprite.y;
      const rcx = (rFrame.centerx ?? 39) * 2;
      const rcy = (rFrame.centery ?? 79) * 2;

      if (rFrame.bdy) {
        for (const b of rFrame.bdy) {
          const bx =
            remote.targetFacing === 1
              ? rx - rcx + b.x * 2
              : rx + rcx - (b.x + b.w) * 2;
          const by = ry - rcy + b.y * 2;
          this.boxGraphics.fillStyle(0x28a745, 0.25);
          this.boxGraphics.fillRect(bx, by, b.w * 2, b.h * 2);
          this.boxGraphics.lineStyle(1.5, 0x28a745, 0.95);
          this.boxGraphics.strokeRect(bx, by, b.w * 2, b.h * 2);
        }
      }
    }
  }
}
