import Phaser from 'phaser';
import { LobbyScene } from '../scenes/LobbyScene';
import { OnlineGameScene } from '../scenes/OnlineGameScene';
import { GameScene } from '../scenes/GameScene';
import { DebugScene } from '../scenes/DebugScene';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 450;

// URL parameter routing
const urlParams =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null;

let initialScenes = [LobbyScene, OnlineGameScene, GameScene, DebugScene];

if (urlParams?.get('scene') === 'debug') {
  initialScenes = [DebugScene, LobbyScene, OnlineGameScene, GameScene];
} else if (urlParams?.get('scene') === 'local' || urlParams?.has('scenario')) {
  initialScenes = [GameScene, LobbyScene, OnlineGameScene, DebugScene];
} else if (urlParams?.get('scene') === 'online') {
  initialScenes = [OnlineGameScene, LobbyScene, GameScene, DebugScene];
}

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#121418',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: initialScenes,
};
