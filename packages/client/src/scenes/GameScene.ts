import Phaser from 'phaser';
import {
  GameSimulation,
  TICK_RATE,
  MS_PER_TICK,
  type CharacterData,
  type InputState,
  type PlayerSimulationState,
  type ProjectileSimulationState,
} from '@lf-online/shared';
import { TouchControls } from '../ui/TouchControls';
import { loadKeyMapping, type KeyMapping } from '../config/keyboardConfig';
import { createArenaStage, preloadArenaAssets } from '../rendering/arena';
import { updateFighterStatus } from '../rendering/hud';

interface PlayerRenderObjects {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  charData: CharacterData;
  atlasKey: string;
}

export class GameScene extends Phaser.Scene {
  private simulation!: GameSimulation;
  private davisData!: CharacterData;
  private dennisData!: CharacterData;

  // Render objects per player
  private playersRender: Map<string, PlayerRenderObjects> = new Map();
  private projectileSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private projectileShadows: Map<string, Phaser.GameObjects.Image> = new Map();
  private boxGraphics!: Phaser.GameObjects.Graphics;

  // UI HUD Elements for P1
  private p1HpBarFill!: Phaser.GameObjects.Graphics;
  private p1MpBarFill!: Phaser.GameObjects.Graphics;
  private p1HpText!: Phaser.GameObjects.Text;
  private p1MpText!: Phaser.GameObjects.Text;

  // UI HUD Elements for P2
  private p2HpBarFill!: Phaser.GameObjects.Graphics;
  private p2MpBarFill!: Phaser.GameObjects.Graphics;
  private p2HpText!: Phaser.GameObjects.Text;
  private p2MpText!: Phaser.GameObjects.Text;

  private debugHUDText!: Phaser.GameObjects.Text;

  // Keyboard Inputs - Player 1 (Default: Arrows + A/S/D)
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private p1KeyA!: Phaser.Input.Keyboard.Key;
  private p1KeyS!: Phaser.Input.Keyboard.Key;
  private p1KeyD!: Phaser.Input.Keyboard.Key;

  // Keyboard Inputs - Player 2 (I/J/K/L or WASD + U/O/P or Numpad)
  private p2Up!: Phaser.Input.Keyboard.Key;
  private p2Down!: Phaser.Input.Keyboard.Key;
  private p2Left!: Phaser.Input.Keyboard.Key;
  private p2Right!: Phaser.Input.Keyboard.Key;
  private p2Att!: Phaser.Input.Keyboard.Key;
  private p2Jmp!: Phaser.Input.Keyboard.Key;
  private p2Def!: Phaser.Input.Keyboard.Key;

  // Fallback / alternate keys for P2
  private p2AttAlt!: Phaser.Input.Keyboard.Key;
  private p2JmpAlt!: Phaser.Input.Keyboard.Key;
  private p2DefAlt!: Phaser.Input.Keyboard.Key;

  private keyB!: Phaser.Input.Keyboard.Key;

  // Debug options
  private showDebugBoxes = true;
  private readonly p1Id = 'player1';
  private readonly p2Id = 'player2';

  // Touch Controls Overlay
  private touchControls!: TouchControls;

  // Fixed tick accumulation
  private tickAccumulator = 0;

  constructor() {
    super('GameScene');
  }

  preload() {
    preloadArenaAssets(this);
  }

  create() {
    this.davisData = this.cache.json.get('davis_data') as CharacterData;
    this.dennisData = this.cache.json.get('dennis_data') as CharacterData;

    if (!this.davisData || !this.dennisData) {
      console.error('Failed to load character data in GameScene');
      return;
    }

    // 1. Initialize Deterministic Simulation
    this.simulation = new GameSimulation({
      minX: 60,
      maxX: 740,
      minZ: 310,
      maxZ: 435,
    });
    this.simulation.registerCharacter(this.davisData);
    this.simulation.registerCharacter(this.dennisData);

    // Add Player 1 (Davis) and Player 2 (Dennis) facing each other
    this.simulation.addPlayer(this.p1Id, 'Davis', 340, 370, 1);
    this.simulation.addPlayer(this.p2Id, 'Dennis', 460, 370, -1);

    // 2. Setup Background & Stage Environment
    createArenaStage(this);

    // 3. Setup Entities (Shadows, Sprites, Collision Visualizer)
    this.setupPlayerRender(this.p1Id, 'davis_atlas', this.davisData, 340, 370);
    this.setupPlayerRender(this.p2Id, 'dennis_atlas', this.dennisData, 460, 370);

    this.boxGraphics = this.add.graphics();
    this.boxGraphics.setDepth(1500); // On top of characters and projectiles

    // 4. Setup HUD (HP, MP, Controls banner, Telemetry)
    this.setupHUD();

    // 5. Setup Keyboard Inputs for Both Players
    this.setupControls();

    // 6. Setup Mobile Touch Controls Overlay
    this.touchControls = new TouchControls(this);

    // Check URL parameters for manual inspection / screenshots
    this.handleUrlParameters();
  }

  private setupPlayerRender(
    id: string,
    atlasKey: string,
    charData: CharacterData,
    initialX: number,
    initialZ: number
  ) {
    const shadow = this.add.image(initialX, initialZ, 'shadow');
    shadow.setOrigin(0.5, 0.5);
    shadow.setAlpha(0.65);
    shadow.setDepth(200);

    const sprite = this.add.sprite(initialX, initialZ, atlasKey, '0');
    sprite.setScale(2); // 2x retro pixel scale

    this.playersRender.set(id, {
      sprite,
      shadow,
      charData,
      atlasKey,
    });
  }

  private setupHUD() {
    const hudContainer = this.add.container(0, 0);
    hudContainer.setDepth(2000);

    // ==========================================
    // Player 1 (Davis) Status Panel (Top Left)
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

    const p1Avatar = this.add.sprite(44, 43, 'davis_atlas', '0');
    p1Avatar.setScale(0.9);
    hudContainer.add(p1Avatar);

    const p1NameText = this.add.text(78, 16, '1P  DAVIS', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#4fc3f7',
      fontStyle: 'bold',
    });
    hudContainer.add(p1NameText);

    // P1 HP Bar
    const p1HpBg = this.add.graphics();
    p1HpBg.fillStyle(0x3a1010, 1);
    p1HpBg.fillRoundedRect(78, 32, 180, 14, 3);
    p1HpBg.lineStyle(1, 0x6e2222, 0.8);
    p1HpBg.strokeRoundedRect(78, 32, 180, 14, 3);
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

    // P1 MP Bar
    const p1MpBg = this.add.graphics();
    p1MpBg.fillStyle(0x10203a, 1);
    p1MpBg.fillRoundedRect(78, 50, 180, 14, 3);
    p1MpBg.lineStyle(1, 0x22446e, 0.8);
    p1MpBg.strokeRoundedRect(78, 50, 180, 14, 3);
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
    // Player 2 (Dennis) Status Panel (Top Right)
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

    const p2Avatar = this.add.sprite(756, 43, 'dennis_atlas', '0');
    p2Avatar.setScale(0.9);
    p2Avatar.setFlipX(true);
    hudContainer.add(p2Avatar);

    const p2NameText = this.add.text(542, 16, '2P  DENNIS', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#81c784',
      fontStyle: 'bold',
    });
    hudContainer.add(p2NameText);

    // P2 HP Bar
    const p2HpBg = this.add.graphics();
    p2HpBg.fillStyle(0x3a1010, 1);
    p2HpBg.fillRoundedRect(542, 32, 180, 14, 3);
    p2HpBg.lineStyle(1, 0x6e2222, 0.8);
    p2HpBg.strokeRoundedRect(542, 32, 180, 14, 3);
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

    // P2 MP Bar
    const p2MpBg = this.add.graphics();
    p2MpBg.fillStyle(0x10203a, 1);
    p2MpBg.fillRoundedRect(542, 50, 180, 14, 3);
    p2MpBg.lineStyle(1, 0x22446e, 0.8);
    p2MpBg.strokeRoundedRect(542, 50, 180, 14, 3);
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

    // Center VS Badge
    const vsBox = this.add.graphics();
    vsBox.fillStyle(0x21252b, 0.95);
    vsBox.fillCircle(400, 44, 24);
    vsBox.lineStyle(2, 0xe5c07b, 0.9);
    vsBox.strokeCircle(400, 44, 24);
    hudContainer.add(vsBox);

    const vsText = this.add.text(388, 35, 'VS', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#f0ad4e',
      fontStyle: 'bold',
    });
    hudContainer.add(vsText);

    // Telemetry text below VS
    this.debugHUDText = this.add.text(280, 82, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#abb2bf',
      align: 'center',
    });
    hudContainer.add(this.debugHUDText);

    // Touch Controls Toggle Button on HUD
    const touchBtn = this.add.text(400, 106, '🎮 TOUCH CONTROLS', {
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
      'P1: ARROWS + A (Att) / S (Jump) / D (Def) | P2: I/J/K/L + U (Att) / O (Jump) / P (Def) | B: Hitboxes',
      {
        fontFamily: 'monospace',
        fontSize: '9.5px',
        color: '#e5c07b',
        fontStyle: 'bold',
      }
    );
    hudContainer.add(controlsBanner);

    // Initial Bars draw
    this.updateHealthManaBars();
  }

  private setupControls() {
    if (!this.input.keyboard) return;

    // Load configurable key mapping for Player 1 (defaults to Arrow keys + A/S/D)
    const keyMap = loadKeyMapping();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.p1KeyA = this.input.keyboard.addKey(keyMap.attack);
    this.p1KeyS = this.input.keyboard.addKey(keyMap.jump);
    this.p1KeyD = this.input.keyboard.addKey(keyMap.defend);

    // Player 2: I (Up), K (Down), J (Left), L (Right) + U (Att), O (Jump), P (Def)
    this.p2Up = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.p2Down = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.p2Left = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.p2Right = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    this.p2Att = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
    this.p2Jmp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);
    this.p2Def = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    // Alternate keys for P2 (Z/X/C)
    this.p2AttAlt = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.p2JmpAlt = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.p2DefAlt = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    // Debug toggle
    this.keyB = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.keyB.on('down', () => {
      this.showDebugBoxes = !this.showDebugBoxes;
      if (!this.showDebugBoxes) {
        this.boxGraphics.clear();
      }
    });
  }

  private collectInputs(): Record<string, InputState> {
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

    const p1Input: InputState = {
      up: (this.cursors ? this.cursors.up.isDown : false) || touchInput.up,
      down: (this.cursors ? this.cursors.down.isDown : false) || touchInput.down,
      left: (this.cursors ? this.cursors.left.isDown : false) || touchInput.left,
      right: (this.cursors ? this.cursors.right.isDown : false) || touchInput.right,
      attack: (this.p1KeyA ? this.p1KeyA.isDown : false) || touchInput.attack,
      jump: (this.p1KeyS ? this.p1KeyS.isDown : false) || touchInput.jump,
      defend: (this.p1KeyD ? this.p1KeyD.isDown : false) || touchInput.defend,
    };

    const p2Input: InputState = {
      up: this.p2Up ? this.p2Up.isDown : false,
      down: this.p2Down ? this.p2Down.isDown : false,
      left: this.p2Left ? this.p2Left.isDown : false,
      right: this.p2Right ? this.p2Right.isDown : false,
      attack: (this.p2Att && this.p2Att.isDown) || (this.p2AttAlt && this.p2AttAlt.isDown),
      jump: (this.p2Jmp && this.p2Jmp.isDown) || (this.p2JmpAlt && this.p2JmpAlt.isDown),
      defend: (this.p2Def && this.p2Def.isDown) || (this.p2DefAlt && this.p2DefAlt.isDown),
    };

    return {
      [this.p1Id]: p1Input,
      [this.p2Id]: p2Input,
    };
  }

  update(_time: number, delta: number) {
    // Fixed 30 TPS simulation accumulator
    this.tickAccumulator += delta;
    while (this.tickAccumulator >= MS_PER_TICK) {
      this.tickAccumulator -= MS_PER_TICK;

      const inputs = this.collectInputs();
      this.simulation.update(inputs);
    }

    // Render simulation state
    this.renderState();
  }

  private renderState() {
    const state = this.simulation.getState();

    // 1. Render Characters
    for (const [id, player] of Object.entries(state.players)) {
      const render = this.playersRender.get(id);
      if (!render) continue;

      const frame =
        render.charData.frames[player.frameId] || render.charData.frames[0];

      // 2.5D Coordinates projection
      const screenX = player.x;
      const screenY = player.z - player.y;

      // Update Sprite
      render.sprite.setPosition(screenX, screenY);
      render.sprite.setScale(player.facing * 2, 2);

      const pic = frame.pic.toString();
      if (this.textures.get(render.atlasKey).has(pic)) {
        render.sprite.setFrame(pic);
      }

      const cx = frame.centerx !== undefined ? frame.centerx : 39;
      const cy = frame.centery !== undefined ? frame.centery : 79;
      render.sprite.setOrigin(cx / 79, cy / 79);

      // Depth sorting: higher Z depth renders in front
      render.sprite.setDepth(player.z);

      // Shadow stays on ground plane at (player.x, player.z + 2)
      render.shadow.setPosition(player.x, player.z + 2);
      const heightRatio = Math.max(0, 1 - player.y / 150);
      render.shadow.setScale(1.8 * heightRatio, 1.2 * heightRatio);
      render.shadow.setAlpha(0.65 * heightRatio);
    }

    // 2. Render Projectiles
    this.renderProjectiles(state.projectiles);

    // 3. Render Hitbox / Hurtbox debug visualization
    if (this.showDebugBoxes) {
      this.drawDebugBoxes(state);
    } else {
      this.boxGraphics.clear();
    }

    // 4. Update HUD
    this.updateHealthManaBars();
    this.updateTelemetry();
  }

  private renderProjectiles(projectiles: ProjectileSimulationState[]) {
    const activeIds = new Set<string>();

    for (const proj of projectiles) {
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

      const screenX = proj.x;
      const screenY = proj.z - proj.y;

      sprite.setPosition(screenX, screenY);
      sprite.setDepth(proj.z + 10);
      sprite.setFlipX(proj.facing === -1);

      if (shadow) {
        shadow.setPosition(proj.x, proj.z + 2);
      }
    }

    // Clean up expired or collided projectiles
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

  private drawDebugBoxes(state: ReturnType<GameSimulation['getState']>) {
    this.boxGraphics.clear();

    for (const [id, player] of Object.entries(state.players)) {
      const render = this.playersRender.get(id);
      if (!render) continue;

      const frame =
        render.charData.frames[player.frameId] || render.charData.frames[0];
      const screenX = player.x;
      const screenY = player.z - player.y;

      const cx = (frame.centerx ?? 39) * 2;
      const cy = (frame.centery ?? 79) * 2;

      // Hurtboxes (bdy) in Green
      if (frame.bdy && frame.bdy.length > 0) {
        for (const b of frame.bdy) {
          const bx =
            player.facing === 1
              ? screenX - cx + b.x * 2
              : screenX + cx - (b.x + b.w) * 2;
          const by = screenY - cy + b.y * 2;
          const bw = b.w * 2;
          const bh = b.h * 2;

          this.boxGraphics.fillStyle(0x28a745, 0.25);
          this.boxGraphics.fillRect(bx, by, bw, bh);
          this.boxGraphics.lineStyle(1.5, 0x28a745, 0.95);
          this.boxGraphics.strokeRect(bx, by, bw, bh);
        }
      }

      // Hitboxes (itr) in Red
      if (frame.itr && frame.itr.length > 0) {
        for (const it of frame.itr) {
          const ix =
            player.facing === 1
              ? screenX - cx + it.x * 2
              : screenX + cx - (it.x + it.w) * 2;
          const iy = screenY - cy + it.y * 2;
          const iw = it.w * 2;
          const ih = it.h * 2;

          this.boxGraphics.fillStyle(0xdc3545, 0.4);
          this.boxGraphics.fillRect(ix, iy, iw, ih);
          this.boxGraphics.lineStyle(2, 0xdc3545, 1);
          this.boxGraphics.strokeRect(ix, iy, iw, ih);
        }
      }
    }

    // Projectile hit circles in Cyan
    for (const proj of state.projectiles) {
      const sx = proj.x;
      const sy = proj.z - proj.y;
      this.boxGraphics.lineStyle(2, 0x00ffff, 0.9);
      this.boxGraphics.strokeCircle(sx, sy, 22);
    }
  }

  private updateHealthManaBars() {
    const p1 = this.simulation.getPlayer(this.p1Id);
    const p2 = this.simulation.getPlayer(this.p2Id);

    if (p1 && this.p1HpBarFill) {
      updateFighterStatus(
        {
          hpFill: this.p1HpBarFill,
          mpFill: this.p1MpBarFill,
          hpText: this.p1HpText,
          mpText: this.p1MpText,
          x: 79,
        },
        p1.hp,
        p1.mp
      );
    }

    if (p2 && this.p2HpBarFill) {
      updateFighterStatus(
        {
          hpFill: this.p2HpBarFill,
          mpFill: this.p2MpBarFill,
          hpText: this.p2HpText,
          mpText: this.p2MpText,
          x: 543,
        },
        p2.hp,
        p2.mp
      );
    }
  }

  private updateTelemetry() {
    const p1 = this.simulation.getPlayer(this.p1Id);
    const p2 = this.simulation.getPlayer(this.p2Id);
    if (!p1 || !p2) return;

    this.debugHUDText.setText(
      `TICK: ${this.simulation.getState().tick} | P1: (${Math.round(p1.x)}, ${Math.round(p1.z)}) [F:${p1.frameId}] | P2: (${Math.round(p2.x)}, ${Math.round(p2.z)}) [F:${p2.frameId}]`
    );
  }

  private handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === '0') {
      this.showDebugBoxes = false;
    }

    const p1 = this.simulation.getPlayer(this.p1Id);
    const p2 = this.simulation.getPlayer(this.p2Id);

    const scenario = urlParams.get('scenario');
    if (scenario === 'combat' && p1 && p2) {
      // P1 punch striking P2 flinch
      p1.x = 380;
      p1.z = 360;
      p1.facing = 1;
      p1.frameId = 61; // Active punch hitbox

      p2.x = 425;
      p2.z = 360;
      p2.facing = -1;
      p2.frameId = 220; // Flinch / injured
      p2.hp = 480;
    } else if (scenario === 'knockdown' && p1 && p2) {
      // P1 standing victoriously, P2 tumbled in midair knockdown
      p1.x = 330;
      p1.z = 360;
      p1.facing = 1;
      p1.frameId = 0;

      p2.x = 450;
      p2.z = 360;
      p2.y = 45;
      p2.vy = 4;
      p2.facing = -1;
      p2.isGrounded = false;
      p2.frameId = 180; // Falling knockdown
      p2.hp = 420;
    } else if (scenario === 'projectile' && p1 && p2) {
      // P1 firing Dragon Blast, projectile flying toward P2 who guards
      p1.x = 240;
      p1.z = 360;
      p1.facing = 1;
      p1.frameId = 240;
      p1.mp = 450;

      p2.x = 550;
      p2.z = 360;
      p2.facing = -1;
      p2.frameId = 110; // Guarding pose

      // Spawn projectile mid-flight
      this.simulation.spawnProjectile(this.p1Id, 380, 35, 360, 11, 1);
    } else if (scenario === 'clash' && p1 && p2) {
      // Opposing energy balls colliding
      p1.x = 260;
      p1.z = 360;
      p1.facing = 1;
      p1.frameId = 240;

      p2.x = 540;
      p2.z = 360;
      p2.facing = -1;
      p2.frameId = 240;

      this.simulation.spawnProjectile(this.p1Id, 375, 35, 360, 10, 1);
      this.simulation.spawnProjectile(this.p2Id, 425, 35, 360, -10, -1);
    }
  }
}
