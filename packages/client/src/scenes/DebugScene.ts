import Phaser from 'phaser';
import type { CharacterData, CharacterFrame } from '@lf-online/shared';

interface AnimationPreset {
  name: string;
  startFrame: number;
}

const PRESETS: AnimationPreset[] = [
  { name: 'Idle', startFrame: 0 },
  { name: 'Walk', startFrame: 5 },
  { name: 'Run', startFrame: 9 },
  { name: 'Punch Combo', startFrame: 60 },
  { name: 'Jump', startFrame: 80 },
  { name: 'Jump Attack', startFrame: 90 },
  { name: 'Defend', startFrame: 110 },
  { name: 'Injured', startFrame: 220 },
  { name: 'Knockdown', startFrame: 180 },
  { name: 'Dragon Punch', startFrame: 240 },
];

export class DebugScene extends Phaser.Scene {
  private charData!: CharacterData;
  private sprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Image;
  private boxGraphics!: Phaser.GameObjects.Graphics;

  private currentFrameId = 0;
  private tickCounter = 0;
  private isPaused = false;
  private facing: 1 | -1 = 1;
  private showBoxes = true;
  private timeScale = 1;

  private activePresetIndex = 0;

  // Text HUD elements
  private infoText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;

  // Arena position
  private readonly spawnX = 400;
  private readonly spawnY = 320;

  constructor() {
    super('DebugScene');
  }

  preload() {
    this.load.atlas(
      'davis_atlas',
      '/assets/characters/davis_atlas.png',
      '/assets/characters/davis_atlas.json'
    );
    this.load.json('davis_data', '/assets/characters/davis.json');
    this.load.image('shadow', '/assets/shadow.png');
    this.load.image('bg_hkc_1', '/assets/bg/hkc/back1.png');
    this.load.image('bg_hkc_2', '/assets/bg/hkc/back2.png');
  }

  create() {
    this.charData = this.cache.json.get('davis_data') as CharacterData;
    if (!this.charData) {
      console.error('Failed to load davis.json');
      return;
    }

    // 1. Render Stage Background
    this.setupBackground();

    // 2. Render Shadow & Character Sprite
    this.shadow = this.add.image(this.spawnX, this.spawnY + 2, 'shadow');
    this.shadow.setOrigin(0.5, 0.5);
    this.shadow.setScale(1.8, 1.2);
    this.shadow.setAlpha(0.65);

    this.sprite = this.add.sprite(this.spawnX, this.spawnY, 'davis_atlas', '0');
    this.sprite.setScale(2); // Scale 2x for retro beat-'em-up clarity

    // 3. Hitbox/Hurtbox Graphics
    this.boxGraphics = this.add.graphics();

    // 4. Setup HUD & UI
    this.setupUI();

    // 5. Setup Keyboard Shortcuts
    this.setupKeyboard();

    // Set initial frame (support URL query param ?preset= or ?frame=)
    const urlParams = new URLSearchParams(window.location.search);
    const presetParam = urlParams.get('preset');
    const frameParam = urlParams.get('frame');

    if (frameParam !== null) {
      this.setFrame(parseInt(frameParam, 10) || 0);
    } else if (presetParam !== null) {
      const pIdx = parseInt(presetParam, 10);
      if (!isNaN(pIdx) && pIdx >= 0 && pIdx < PRESETS.length) {
        this.selectPreset(pIdx);
      } else {
        this.setFrame(0);
      }
    } else {
      this.setFrame(0);
    }

    if (urlParams.get('pause') === '1') {
      this.isPaused = true;
      this.updateHUD();
    }
  }

  private setupBackground() {
    // Stage upper banner & arena background
    const bgTop = this.add.image(400, 100, 'bg_hkc_1');
    bgTop.setDisplaySize(800, 160);

    const bgCrowd = this.add.image(400, 200, 'bg_hkc_2');
    bgCrowd.setDisplaySize(800, 120);

    // Floor rectangle with gradient feel
    const floor = this.add.graphics();
    floor.fillStyle(0x2d3238, 1);
    floor.fillRect(0, 240, 800, 210);

    // Floor ring grid line
    floor.lineStyle(2, 0x3f4650, 0.8);
    floor.beginPath();
    floor.moveTo(0, 260);
    floor.lineTo(800, 260);
    floor.moveTo(0, 420);
    floor.lineTo(800, 420);
    floor.strokePath();

    // Top Header Bar
    const topBar = this.add.graphics();
    topBar.fillStyle(0x111317, 0.95);
    topBar.fillRect(0, 0, 800, 42);
    topBar.lineStyle(1, 0xe49b23, 0.7);
    topBar.lineBetween(0, 42, 800, 42);

    const title = this.add.text(14, 11, 'LF ONLINE - PHASE 1: ANIMATION DEBUG & ASSET PIPELINE', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#f0ad4e',
      fontStyle: 'bold',
    });
    title.setShadow(1, 1, '#000000', 2);
  }

  private setupUI() {
    // HUD panel for current frame info
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x181b20, 0.92);
    hudBg.fillRoundedRect(14, 50, 275, 160, 6);
    hudBg.lineStyle(1, 0x3a424d, 0.8);
    hudBg.strokeRoundedRect(14, 50, 275, 160, 6);

    this.infoText = this.add.text(24, 58, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffffff',
      lineSpacing: 3,
    });

    this.stateText = this.add.text(24, 182, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#5bc0de',
      fontStyle: 'bold',
    });

    // Right-side instructions / help panel
    const helpBg = this.add.graphics();
    helpBg.fillStyle(0x181b20, 0.92);
    helpBg.fillRoundedRect(530, 50, 256, 160, 6);
    helpBg.lineStyle(1, 0x3a424d, 0.8);
    helpBg.strokeRoundedRect(530, 50, 256, 160, 6);

    this.controlsText = this.add.text(
      540,
      60,
      [
        'KEYBOARD SHORTCUTS:',
        '[1-9, 0]  Switch Move Preset',
        '[SPACE]   Pause / Resume',
        '[RIGHT]   Step 1 Frame Forward',
        '[B]       Toggle Hit/Hurt Boxes',
        '[F]       Flip Facing (Left/Right)',
        '[S]       Toggle 0.5x Slow-Mo',
      ].join('\n'),
      {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#e0e0e0',
        lineSpacing: 3,
      }
    );

    // Bottom preset selection button bar
    this.createPresetButtons();
  }

  private createPresetButtons() {
    const btnContainerY = 398;
    const btnWidth = 74;
    const btnHeight = 28;
    const startX = 22;

    PRESETS.forEach((preset, idx) => {
      const bx = startX + idx * (btnWidth + 4);
      const btn = this.add.graphics();
      btn.setInteractive(
        new Phaser.Geom.Rectangle(bx, btnContainerY, btnWidth, btnHeight),
        Phaser.Geom.Rectangle.Contains
      );

      const drawButton = (hover = false, active = false) => {
        btn.clear();
        if (active) {
          btn.fillStyle(0xd9534f, 1);
        } else if (hover) {
          btn.fillStyle(0x428bca, 0.95);
        } else {
          btn.fillStyle(0x22262c, 0.9);
        }
        btn.fillRoundedRect(bx, btnContainerY, btnWidth, btnHeight, 4);
        btn.lineStyle(1, active ? 0xffffff : 0x4e5866, 0.8);
        btn.strokeRoundedRect(bx, btnContainerY, btnWidth, btnHeight, 4);
      };

      drawButton(false, idx === this.activePresetIndex);

      btn.on('pointerover', () => {
        if (idx !== this.activePresetIndex) drawButton(true, false);
      });
      btn.on('pointerout', () => {
        drawButton(false, idx === this.activePresetIndex);
      });
      btn.on('pointerdown', () => {
        this.selectPreset(idx);
      });

      this.add
        .text(bx + btnWidth / 2, btnContainerY + btnHeight / 2, preset.name, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0.5);
    });

    // Sub-bar for toggle actions
    this.createActionButtons();
  }

  private createActionButtons() {
    const actions = [
      {
        name: 'PAUSE',
        action: () => this.togglePause(),
      },
      {
        name: 'STEP >',
        action: () => this.stepFrame(),
      },
      {
        name: 'BOXES',
        action: () => this.toggleBoxes(),
      },
      {
        name: 'FACING',
        action: () => this.toggleFacing(),
      },
      {
        name: 'SPEED',
        action: () => this.toggleSpeed(),
      },
    ];

    const y = 360;
    const w = 70;
    const h = 24;
    const startX = 220;

    actions.forEach((act, idx) => {
      const bx = startX + idx * (w + 8);
      const btn = this.add.graphics();
      btn.setInteractive(
        new Phaser.Geom.Rectangle(bx, y, w, h),
        Phaser.Geom.Rectangle.Contains
      );

      const draw = (hover = false) => {
        btn.clear();
        btn.fillStyle(hover ? 0x337ab7 : 0x2b3038, 0.9);
        btn.fillRoundedRect(bx, y, w, h, 4);
        btn.lineStyle(1, 0x5a6370, 0.7);
        btn.strokeRoundedRect(bx, y, w, h, 4);
      };
      draw(false);

      btn.on('pointerover', () => draw(true));
      btn.on('pointerout', () => draw(false));
      btn.on('pointerdown', act.action);

      this.add
        .text(bx + w / 2, y + h / 2, act.name, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#e8e8e8',
        })
        .setOrigin(0.5, 0.5);
    });
  }

  private setupKeyboard() {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        this.togglePause();
      } else if (event.code === 'ArrowRight') {
        this.stepFrame();
      } else if (event.code === 'KeyB') {
        this.toggleBoxes();
      } else if (event.code === 'KeyF') {
        this.toggleFacing();
      } else if (event.code === 'KeyS') {
        this.toggleSpeed();
      } else if (event.code.startsWith('Digit')) {
        const num = parseInt(event.code.replace('Digit', ''), 10);
        if (num >= 1 && num <= 9) {
          this.selectPreset(num - 1);
        } else if (num === 0) {
          this.selectPreset(9);
        }
      }
    });
  }

  private selectPreset(idx: number) {
    if (idx < 0 || idx >= PRESETS.length) return;
    this.activePresetIndex = idx;
    this.setFrame(PRESETS[idx].startFrame);
    this.isPaused = false;
  }

  private togglePause() {
    this.isPaused = !this.isPaused;
    this.updateHUD();
  }

  private toggleBoxes() {
    this.showBoxes = !this.showBoxes;
    this.drawBoxes();
    this.updateHUD();
  }

  private toggleFacing() {
    this.facing = this.facing === 1 ? -1 : 1;
    this.sprite.setScale(this.facing * 2, 2);
    this.drawBoxes();
  }

  private toggleSpeed() {
    this.timeScale = this.timeScale === 1 ? 0.4 : 1;
    this.updateHUD();
  }

  private stepFrame() {
    this.isPaused = true;
    this.advanceFrame();
  }

  private setFrame(frameId: number) {
    this.currentFrameId = frameId;
    this.tickCounter = 0;

    const frame = this.getFrame(frameId);
    if (!frame) return;

    const pic = frame.pic.toString();
    if (this.textures.get('davis_atlas').has(pic)) {
      this.sprite.setFrame(pic);
    }

    // Set pivot origin based on LF2 centerx/centery
    const cx = frame.centerx !== undefined ? frame.centerx : 39;
    const cy = frame.centery !== undefined ? frame.centery : 79;
    this.sprite.setOrigin(cx / 79, cy / 79);

    this.drawBoxes();
    this.updateHUD();
  }

  private getFrame(frameId: number): CharacterFrame | undefined {
    return this.charData.frames[frameId];
  }

  private advanceFrame() {
    const frame = this.getFrame(this.currentFrameId);
    if (!frame) return;

    let nextId = frame.next;
    // LF2 convention: 999 or 0 loops back to preset or standing
    if (nextId === 999 || nextId === 0) {
      nextId = PRESETS[this.activePresetIndex].startFrame;
    }

    if (!this.getFrame(nextId)) {
      nextId = 0;
    }

    this.setFrame(nextId);
  }

  // LF2 fixed simulation tick update (30 ticks per second)
  private tickAccumulator = 0;
  private readonly TICK_MS = 1000 / 30;

  update(_time: number, delta: number) {
    if (this.isPaused) return;

    this.tickAccumulator += delta * this.timeScale;
    while (this.tickAccumulator >= this.TICK_MS) {
      this.tickAccumulator -= this.TICK_MS;
      this.tick();
    }
  }

  private tick() {
    const frame = this.getFrame(this.currentFrameId);
    if (!frame) return;

    this.tickCounter++;
    if (this.tickCounter >= frame.wait) {
      this.advanceFrame();
    }
  }

  private drawBoxes() {
    this.boxGraphics.clear();
    if (!this.showBoxes) return;

    const frame = this.getFrame(this.currentFrameId);
    if (!frame) return;

    const cx = (frame.centerx ?? 39) * 2;
    const cy = (frame.centery ?? 79) * 2;
    const originX = this.spawnX;
    const originY = this.spawnY;

    // Draw Hurtboxes (bdy) in Green
    if (frame.bdy && frame.bdy.length > 0) {
      for (const b of frame.bdy) {
        const bx = this.facing === 1
          ? originX - cx + b.x * 2
          : originX + cx - (b.x + b.w) * 2;
        const by = originY - cy + b.y * 2;
        const bw = b.w * 2;
        const bh = b.h * 2;

        this.boxGraphics.fillStyle(0x28a745, 0.25);
        this.boxGraphics.fillRect(bx, by, bw, bh);
        this.boxGraphics.lineStyle(1.5, 0x28a745, 0.95);
        this.boxGraphics.strokeRect(bx, by, bw, bh);
      }
    }

    // Draw Hitboxes (itr) in Red
    if (frame.itr && frame.itr.length > 0) {
      for (const it of frame.itr) {
        const ix = this.facing === 1
          ? originX - cx + it.x * 2
          : originX + cx - (it.x + it.w) * 2;
        const iy = originY - cy + it.y * 2;
        const iw = it.w * 2;
        const ih = it.h * 2;

        this.boxGraphics.fillStyle(0xdc3545, 0.35);
        this.boxGraphics.fillRect(ix, iy, iw, ih);
        this.boxGraphics.lineStyle(2, 0xdc3545, 1);
        this.boxGraphics.strokeRect(ix, iy, iw, ih);
      }
    }
  }

  private updateHUD() {
    const frame = this.getFrame(this.currentFrameId);
    if (!frame) return;

    const currentPreset = PRESETS[this.activePresetIndex];
    const bdyCount = frame.bdy ? frame.bdy.length : 0;
    const itrCount = frame.itr ? frame.itr.length : 0;

    this.infoText.setText([
      `Character:  ${this.charData.name}`,
      `Move Set:   ${currentPreset.name}`,
      `Frame ID:   ${this.currentFrameId} (pic: ${frame.pic})`,
      `Hold Wait:  ${this.tickCounter}/${frame.wait} ticks`,
      `Next Frame: ${frame.next}`,
      `Boxes:      Hurt: ${bdyCount} | Hit: ${itrCount}`,
      `Physics:    dvx: ${frame.dvx} dvy: ${frame.dvy}`,
    ]);

    this.stateText.setText(
      `STATE: [${frame.state.toString().toUpperCase()}] | ${
        this.isPaused ? 'PAUSED' : 'PLAYING'
      } | SPEED: ${this.timeScale}x`
    );
  }
}
