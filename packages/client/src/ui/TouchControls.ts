import Phaser from 'phaser';
import type { InputState } from '@lf-online/shared';

export interface TouchControlsConfig {
  size?: 'small' | 'medium' | 'large';
  opacity?: number;
  forceShow?: boolean;
}

export class TouchControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isVisible = false;

  // Joystick state
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickThumb!: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;
  private joystickCenter = { x: 105, y: 350 };
  private joystickRadius = 50;
  private joystickThumbRadius = 24;

  // Button states
  private attackBtn!: Phaser.GameObjects.Container;
  private jumpBtn!: Phaser.GameObjects.Container;
  private defendBtn!: Phaser.GameObjects.Container;

  private attackPointerId: number | null = null;
  private jumpPointerId: number | null = null;
  private defendPointerId: number | null = null;

  // Input states
  private state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    attack: false,
    jump: false,
    defend: false,
  };

  private currentSize: 'small' | 'medium' | 'large' = 'medium';
  private currentOpacity = 0.65;

  constructor(scene: Phaser.Scene, config: TouchControlsConfig = {}) {
    this.scene = scene;
    this.currentSize = config.size || 'medium';
    this.currentOpacity = config.opacity ?? 0.65;

    // Ensure multi-touch pointers are available
    if (this.scene.input.manager.pointers.length < 5) {
      this.scene.input.addPointer(4);
    }

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1000); // Overlay on top of gameplay and HUD
    this.container.setScrollFactor(0); // Fixed screen overlay

    this.buildJoystick();
    this.buildActionButtons();
    this.buildUtilityButtons();

    // Determine auto-visibility: touch device or URL flag (?touch=1 or ?touch=true)
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (this.scene.sys.game.device.input.touch ?? false);

    const forceTouch =
      config.forceShow ||
      (typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('touch'));

    this.setVisible(isTouchDevice || forceTouch);
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;
    this.container.setVisible(visible);
  }

  public toggleVisible() {
    this.setVisible(!this.isVisible);
    return this.isVisible;
  }

  public getInput(): InputState {
    return { ...this.state };
  }

  private buildJoystick() {
    const scaleFactor = this.getScaleFactor();
    const r = this.joystickRadius * scaleFactor;
    const tr = this.joystickThumbRadius * scaleFactor;

    // Joystick Base Outer Glow & Fill
    this.joystickBase = this.scene.add.arc(
      this.joystickCenter.x,
      this.joystickCenter.y,
      r,
      0,
      360,
      false,
      0x181a1f,
      this.currentOpacity
    );
    this.joystickBase.setStrokeStyle(2.5, 0x61afef, this.currentOpacity + 0.2);

    // Directional Cross indicators on Base
    const dirG = this.scene.add.graphics();
    dirG.lineStyle(1.5, 0xabb2bf, this.currentOpacity * 0.4);
    dirG.beginPath();
    // Horizontal cross
    dirG.moveTo(this.joystickCenter.x - r * 0.75, this.joystickCenter.y);
    dirG.lineTo(this.joystickCenter.x + r * 0.75, this.joystickCenter.y);
    // Vertical cross
    dirG.moveTo(this.joystickCenter.x, this.joystickCenter.y - r * 0.75);
    dirG.lineTo(this.joystickCenter.x, this.joystickCenter.y + r * 0.75);
    dirG.strokePath();

    // Joystick Thumbstick
    this.joystickThumb = this.scene.add.arc(
      this.joystickCenter.x,
      this.joystickCenter.y,
      tr,
      0,
      360,
      false,
      0x4fa3e3,
      this.currentOpacity + 0.15
    );
    this.joystickThumb.setStrokeStyle(2, 0xffffff, 0.8);

    this.container.add([this.joystickBase, dirG, this.joystickThumb]);

    // Touch Zone on left half for joystick interaction
    // Touch anywhere in bottom-left area triggers joystick
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isVisible) return;
      if (pointer.x < 280 && pointer.y > 180 && this.joystickPointerId === null) {
        this.joystickPointerId = pointer.id;
        this.updateJoystickPosition(pointer.x, pointer.y);
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isVisible) return;
      if (pointer.id === this.joystickPointerId) {
        this.updateJoystickPosition(pointer.x, pointer.y);
      }
    });

    const releaseJoystick = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.resetJoystick();
      }
    };

    this.scene.input.on('pointerup', releaseJoystick);
    this.scene.input.on('pointerupoutside', releaseJoystick);
  }

  private updateJoystickPosition(touchX: number, touchY: number) {
    const scaleFactor = this.getScaleFactor();
    const maxR = this.joystickRadius * scaleFactor;
    const deadzone = 8;

    const dx = touchX - this.joystickCenter.x;
    const dy = touchY - this.joystickCenter.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= maxR) {
      this.joystickThumb.setPosition(touchX, touchY);
    } else {
      const angle = Math.atan2(dy, dx);
      this.joystickThumb.setPosition(
        this.joystickCenter.x + Math.cos(angle) * maxR,
        this.joystickCenter.y + Math.sin(angle) * maxR
      );
    }

    if (dist < deadzone) {
      this.state.up = false;
      this.state.down = false;
      this.state.left = false;
      this.state.right = false;
      return;
    }

    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // 8-way directional threshold
    const threshold = 0.38; // ~22.5 degrees for clean diagonal / straight inputs
    this.state.right = cos > threshold;
    this.state.left = cos < -threshold;
    this.state.down = sin > threshold;
    this.state.up = sin < -threshold;
  }

  private resetJoystick() {
    this.joystickThumb.setPosition(this.joystickCenter.x, this.joystickCenter.y);
    this.state.up = false;
    this.state.down = false;
    this.state.left = false;
    this.state.right = false;
  }

  private buildActionButtons() {
    const scaleFactor = this.getScaleFactor();
    const btnRadius = 28 * scaleFactor;

    // Classic LF2 Arcade Triangle Layout:
    // Attack (top): (685, 310)
    // Defend (left): (620, 375)
    // Jump (right): (745, 375)
    const attackPos = { x: 685, y: 310 };
    const defendPos = { x: 620, y: 375 };
    const jumpPos = { x: 745, y: 375 };

    this.attackBtn = this.createActionButton(
      attackPos.x,
      attackPos.y,
      btnRadius,
      'ATTACK',
      'A',
      0xe06c75, // Crimson Red
      (pressed, pointerId) => {
        if (pressed) {
          this.attackPointerId = pointerId;
          this.state.attack = true;
        } else if (this.attackPointerId === pointerId) {
          this.attackPointerId = null;
          this.state.attack = false;
        }
      }
    );

    this.jumpBtn = this.createActionButton(
      jumpPos.x,
      jumpPos.y,
      btnRadius,
      'JUMP',
      'J',
      0x61afef, // Cyan Blue
      (pressed, pointerId) => {
        if (pressed) {
          this.jumpPointerId = pointerId;
          this.state.jump = true;
        } else if (this.jumpPointerId === pointerId) {
          this.jumpPointerId = null;
          this.state.jump = false;
        }
      }
    );

    this.defendBtn = this.createActionButton(
      defendPos.x,
      defendPos.y,
      btnRadius,
      'DEFEND',
      'D',
      0xe5c07b, // Amber Gold
      (pressed, pointerId) => {
        if (pressed) {
          this.defendPointerId = pointerId;
          this.state.defend = true;
        } else if (this.defendPointerId === pointerId) {
          this.defendPointerId = null;
          this.state.defend = false;
        }
      }
    );

    this.container.add([this.attackBtn, this.jumpBtn, this.defendBtn]);
  }

  private createActionButton(
    x: number,
    y: number,
    radius: number,
    name: string,
    keyLetter: string,
    colorHex: number,
    onStateChange: (pressed: boolean, pointerId: number) => void
  ): Phaser.GameObjects.Container {
    const btnContainer = this.scene.add.container(x, y);

    const circle = this.scene.add.arc(
      0,
      0,
      radius,
      0,
      360,
      false,
      colorHex,
      this.currentOpacity
    );
    circle.setStrokeStyle(2, 0xffffff, 0.85);

    const letterText = this.scene.add.text(0, -3, keyLetter, {
      fontFamily: 'monospace',
      fontSize: `${Math.round(radius * 0.9)}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    });
    letterText.setOrigin(0.5, 0.5);

    const labelText = this.scene.add.text(0, radius * 0.65, name, {
      fontFamily: 'monospace',
      fontSize: `${Math.max(7, Math.round(radius * 0.28))}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    });
    labelText.setOrigin(0.5, 0.5);

    btnContainer.add([circle, letterText, labelText]);

    // Make circle interactive for multi-touch
    circle.setInteractive(
      new Phaser.Geom.Circle(0, 0, radius * 1.25),
      Phaser.Geom.Circle.Contains
    );

    circle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      circle.setFillStyle(colorHex, 0.92);
      btnContainer.setScale(0.92);
      onStateChange(true, pointer.id);
    });

    const handleRelease = (pointer: Phaser.Input.Pointer) => {
      circle.setFillStyle(colorHex, this.currentOpacity);
      btnContainer.setScale(1.0);
      onStateChange(false, pointer.id);
    };

    circle.on('pointerup', handleRelease);
    circle.on('pointerout', handleRelease);

    return btnContainer;
  }

  private buildUtilityButtons() {
    // Center Utility Bar (Below VS badge & telemetry)
    const centerBar = this.scene.add.container(400, 128);

    // Controls Size Toggle (S -> M -> L)
    const sizeBg = this.scene.add.rectangle(-55, 0, 56, 20, 0x181a1f, 0.85);
    sizeBg.setStrokeStyle(1, 0xe5c07b, 0.8);
    const sizeText = this.scene.add.text(-55, 0, `SZ: ${this.currentSize[0].toUpperCase()}`, {
      fontFamily: 'monospace',
      fontSize: '9.5px',
      color: '#e5c07b',
      fontStyle: 'bold',
    });
    sizeText.setOrigin(0.5, 0.5);
    sizeBg.setInteractive({ useHandCursor: true });
    sizeBg.on('pointerdown', () => {
      if (this.currentSize === 'small') this.currentSize = 'medium';
      else if (this.currentSize === 'medium') this.currentSize = 'large';
      else this.currentSize = 'small';

      sizeText.setText(`SZ: ${this.currentSize[0].toUpperCase()}`);
      this.rebuildControls();
    });

    // Fullscreen Button
    const fsBg = this.scene.add.rectangle(55, 0, 56, 20, 0x181a1f, 0.85);
    fsBg.setStrokeStyle(1, 0x61afef, 0.8);
    const fsText = this.scene.add.text(55, 0, '⛶ FS', {
      fontFamily: 'monospace',
      fontSize: '9.5px',
      color: '#61afef',
      fontStyle: 'bold',
    });
    fsText.setOrigin(0.5, 0.5);
    fsBg.setInteractive({ useHandCursor: true });
    fsBg.on('pointerdown', () => this.toggleFullscreen());

    centerBar.add([sizeBg, sizeText, fsBg, fsText]);
    this.container.add(centerBar);
  }

  private getScaleFactor(): number {
    switch (this.currentSize) {
      case 'small':
        return 0.82;
      case 'large':
        return 1.25;
      case 'medium':
      default:
        return 1.0;
    }
  }

  private rebuildControls() {
    this.container.removeAll(true);
    this.buildJoystick();
    this.buildActionButtons();
    this.buildUtilityButtons();
  }

  public toggleFullscreen() {
    if (this.scene.scale.isFullscreen) {
      this.scene.scale.stopFullscreen();
    } else {
      this.scene.scale.startFullscreen();
      // Try orientation lock if supported
      try {
        if ('orientation' in screen && 'lock' in screen.orientation) {
          (screen.orientation as any).lock('landscape').catch(() => {
            // Orientation lock may fail if not supported or not in fullscreen
          });
        }
      } catch {
        // Ignore unsupported platforms
      }
    }
  }

  public destroy() {
    this.container.destroy();
  }
}
