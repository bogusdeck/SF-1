import Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';
import type { NetworkRoomState, NetworkPlayerState } from '@lf-online/shared';

export class LobbyScene extends Phaser.Scene {
  private network!: NetworkManager;
  private currentRoomCode = '';
  private statusText!: Phaser.GameObjects.Text;
  private roomCodeText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;

  // View state: 'menu' | 'in_room'
  private viewState: 'menu' | 'in_room' = 'menu';
  private menuContainer!: Phaser.GameObjects.Container;
  private roomContainer!: Phaser.GameObjects.Container;

  // Player slot cards in room
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private slotPortraits: Phaser.GameObjects.Sprite[] = [];
  private readyButtonText!: Phaser.GameObjects.Text;
  private isLocalReady = false;
  private selectedCharacter: 'Davis' | 'Dennis' = 'Davis';

  constructor() {
    super('LobbyScene');
  }

  preload() {
    this.load.atlas(
      'davis_atlas',
      '/assets/characters/davis_atlas.png',
      '/assets/characters/davis_atlas.json'
    );
    this.load.atlas(
      'dennis_atlas',
      '/assets/characters/dennis_atlas.png',
      '/assets/characters/dennis_atlas.json'
    );
    this.load.image('bg_hkc_1', '/assets/bg/hkc/back1.png');
    this.load.image('bg_hkc_2', '/assets/bg/hkc/back2.png');
  }

  create() {
    this.network = NetworkManager.getInstance();

    // 1. Stage Background
    this.setupBackground();

    // 2. Title Header
    const title = this.add.text(400, 45, 'LF ONLINE', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#e5c07b',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);

    const subtitle = this.add.text(400, 72, 'CROSS-PLATFORM 2.5D MULTIPLAYER FIGHTING ENGINE', {
      fontFamily: 'monospace',
      fontSize: '10.5px',
      color: '#abb2bf',
    });
    subtitle.setOrigin(0.5, 0.5);

    // Status / Message banner
    this.statusText = this.add.text(400, 95, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#61afef',
    });
    this.statusText.setOrigin(0.5, 0.5);

    // 3. Main Menu Container
    this.setupMainMenu();

    // 4. In-Room Character Select Container
    this.setupRoomView();

    // Check URL parameters for direct auto-join (?join=CODE or ?create=1 or ?code=CODE)
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    const autoCreate = urlParams.get('create');
    const customCode = urlParams.get('code');

    if (joinCode) {
      this.handleJoinByCode(joinCode.toUpperCase());
    } else if (autoCreate === '1' || customCode) {
      this.handleCreateRoom(customCode || undefined);
    }
  }

  private setupBackground() {
    const bgStadium = this.add.image(400, 100, 'bg_hkc_1');
    bgStadium.setDisplaySize(800, 160);
    bgStadium.setAlpha(0.65);

    const bgCrowd = this.add.image(400, 200, 'bg_hkc_2');
    bgCrowd.setDisplaySize(800, 120);
    bgCrowd.setAlpha(0.6);

    const floor = this.add.graphics();
    floor.fillStyle(0x181a1f, 0.95);
    floor.fillRect(0, 0, 800, 450);
  }

  private setupMainMenu() {
    this.menuContainer = this.add.container(400, 250);

    // 1. Create Room Button
    const createBtn = this.createButton(0, -50, 320, 46, 'CREATE ONLINE ROOM', 0x28a745, () => {
      this.handleCreateRoom();
    });
    this.menuContainer.add(createBtn);

    // 2. Join by Code Button
    const joinBtn = this.createButton(0, 15, 320, 46, 'JOIN WITH ROOM CODE', 0x1f6feb, () => {
      const code = window.prompt('Enter 5-character Room Code:');
      if (code) {
        this.handleJoinByCode(code.toUpperCase().trim());
      }
    });
    this.menuContainer.add(joinBtn);

    // 3. Local 2-Player (Offline) Button
    const localBtn = this.createButton(0, 80, 320, 46, 'LOCAL 2-PLAYER COMBAT', 0x6e7681, () => {
      this.scene.start('GameScene');
    });
    this.menuContainer.add(localBtn);
  }

  private setupRoomView() {
    this.roomContainer = this.add.container(400, 250);
    this.roomContainer.setVisible(false);

    // Header Panel: Room Code
    const codePanel = this.add.graphics();
    codePanel.fillStyle(0x21252b, 0.95);
    codePanel.fillRoundedRect(-240, -135, 480, 46, 6);
    codePanel.lineStyle(1.5, 0xe5c07b, 0.9);
    codePanel.strokeRoundedRect(-240, -135, 480, 46, 6);
    this.roomContainer.add(codePanel);

    this.roomCodeText = this.add.text(0, -112, 'ROOM CODE: -----', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e5c07b',
      fontStyle: 'bold',
    });
    this.roomCodeText.setOrigin(0.5, 0.5);
    this.roomContainer.add(this.roomCodeText);

    // Player Slots (4 Cards)
    const slotX = [-210, -70, 70, 210];
    for (let i = 0; i < 4; i++) {
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x181a1f, 0.95);
      cardBg.fillRoundedRect(slotX[i] - 60, -75, 120, 130, 4);
      cardBg.lineStyle(1, 0x3d4552, 0.8);
      cardBg.strokeRoundedRect(slotX[i] - 60, -75, 120, 130, 4);
      this.roomContainer.add(cardBg);

      const portrait = this.add.sprite(slotX[i], -25, 'davis_atlas', '0');
      portrait.setScale(1.2);
      portrait.setVisible(false);
      this.roomContainer.add(portrait);
      this.slotPortraits.push(portrait);

      const slotText = this.add.text(slotX[i], 28, `Slot ${i + 1}\nEmpty`, {
        fontFamily: 'monospace',
        fontSize: '9.5px',
        color: '#6c757d',
        align: 'center',
      });
      slotText.setOrigin(0.5, 0.5);
      this.roomContainer.add(slotText);
      this.slotTexts.push(slotText);
    }

    // Character Selection Buttons (Davis / Dennis)
    const davisBtn = this.createButton(-140, 85, 130, 32, 'DAVIS', 0x4fc3f7, () => {
      this.selectedCharacter = 'Davis';
      this.network.selectCharacter('Davis');
    });
    this.roomContainer.add(davisBtn);

    const dennisBtn = this.createButton(0, 85, 130, 32, 'DENNIS', 0x81c784, () => {
      this.selectedCharacter = 'Dennis';
      this.network.selectCharacter('Dennis');
    });
    this.roomContainer.add(dennisBtn);

    // Ready Button
    const readyBtn = this.createButton(140, 85, 130, 32, 'READY', 0xd9534f, () => {
      this.isLocalReady = !this.isLocalReady;
      this.network.setReady(this.isLocalReady);
      this.readyButtonText.setText(this.isLocalReady ? 'READY!' : 'NOT READY');
    });
    this.readyButtonText = readyBtn.getByName('btn_text') as Phaser.GameObjects.Text;
    this.roomContainer.add(readyBtn);

    // Countdown Overlay
    this.countdownText = this.add.text(0, 140, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#f0ad4e',
      fontStyle: 'bold',
    });
    this.countdownText.setOrigin(0.5, 0.5);
    this.roomContainer.add(this.countdownText);
  }

  private createButton(
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    colorHex: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(colorHex, 0.9);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    bg.lineStyle(1.5, 0xffffff, 0.3);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    btn.add(bg);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    label.setName('btn_text');
    label.setOrigin(0.5, 0.5);
    btn.add(label);

    const hitArea = new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h);
    btn.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    btn.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(colorHex, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      bg.lineStyle(2, 0xffffff, 0.8);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    });

    btn.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(colorHex, 0.9);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      bg.lineStyle(1.5, 0xffffff, 0.3);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    });

    btn.on('pointerdown', onClick);

    return btn;
  }

  private async handleCreateRoom(customCode?: string) {
    this.statusText.setText('Creating room on authoritative server...');
    try {
      const room = await this.network.createRoom(
        'Player 1',
        this.selectedCharacter,
        customCode
      );
      this.attachRoomListeners(room);
    } catch (err: any) {
      this.statusText.setText(`Failed to create room: ${err.message}`);
    }
  }

  private async handleJoinByCode(code: string) {
    this.statusText.setText(`Joining room ${code}...`);
    try {
      const room = await this.network.joinRoomByCode(code, 'Player 2', this.selectedCharacter);
      this.attachRoomListeners(room);
    } catch (err: any) {
      this.statusText.setText(`Failed to join room ${code}: ${err.message}`);
    }
  }

  private attachRoomListeners(room: ReturnType<NetworkManager['getRoom']>) {
    if (!room) return;

    this.currentRoomCode = room.state?.roomCode || '';
    this.roomCodeText.setText(`ROOM CODE:  ${this.currentRoomCode || 'CONNECTING...'}`);
    this.statusText.setText(`Connected to room! Share code: ${this.currentRoomCode || '...'}`);

    this.viewState = 'in_room';
    this.menuContainer.setVisible(false);
    this.roomContainer.setVisible(true);

    room.onStateChange((state: NetworkRoomState) => {
      this.syncLobbyState(state);
    });
  }

  private syncLobbyState(state: NetworkRoomState) {
    if (!state) return;

    if (state.roomCode && state.roomCode !== this.currentRoomCode) {
      this.currentRoomCode = state.roomCode;
      this.roomCodeText.setText(`ROOM CODE:  ${this.currentRoomCode}`);
    }

    // Reset slots display
    for (let i = 0; i < 4; i++) {
      this.slotTexts[i].setText(`Slot ${i + 1}\nEmpty`);
      this.slotTexts[i].setColor('#6c757d');
      this.slotPortraits[i].setVisible(false);
    }

    // Populate joined players
    state.players.forEach((player: NetworkPlayerState) => {
      const slot = player.slot;
      if (slot >= 0 && slot < 4) {
        const charName = player.character || 'Davis';
        const readyStatus = player.isReady ? 'READY' : 'NOT READY';
        const readyColor = player.isReady ? '#28a745' : '#e06c75';

        this.slotTexts[slot].setText(
          `${player.name}\n[${charName}]\n${readyStatus}`
        );
        this.slotTexts[slot].setColor(readyColor);

        const atlasKey = charName.toLowerCase() === 'dennis' ? 'dennis_atlas' : 'davis_atlas';
        this.slotPortraits[slot].setTexture(atlasKey, '0');
        this.slotPortraits[slot].setVisible(true);
      }
    });

    // Check countdown & battle transition
    if (state.phase === 'countdown') {
      this.countdownText.setText(
        `ALL PLAYERS READY! STARTING IN ${state.countdown}...`
      );
    } else if (state.phase === 'battle') {
      this.countdownText.setText('FIGHT!');
      this.scene.start('OnlineGameScene');
    } else {
      this.countdownText.setText('');
    }
  }
}
