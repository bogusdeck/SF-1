import Phaser from 'phaser';

export function preloadArenaAssets(scene: Phaser.Scene): void {
  scene.load.atlas(
    'davis_atlas',
    '/assets/characters/davis_atlas.png',
    '/assets/characters/davis_atlas.json'
  );
  scene.load.json('davis_data', '/assets/characters/davis.json');

  scene.load.atlas(
    'dennis_atlas',
    '/assets/characters/dennis_atlas.png',
    '/assets/characters/dennis_atlas.json'
  );
  scene.load.json('dennis_data', '/assets/characters/dennis.json');

  scene.load.image('shadow', '/assets/shadow.png');
  scene.load.image('energy_ball', '/assets/energy_ball.png');
  scene.load.image('bg_hkc_1', '/assets/bg/hkc/back1.png');
  scene.load.image('bg_hkc_2', '/assets/bg/hkc/back2.png');
}

export function createArenaStage(scene: Phaser.Scene): void {
  const stadium = scene.add.image(400, 100, 'bg_hkc_1');
  stadium.setDisplaySize(800, 160);
  stadium.setDepth(10);

  const crowd = scene.add.image(400, 200, 'bg_hkc_2');
  crowd.setDisplaySize(800, 120);
  crowd.setDepth(20);

  const floor = scene.add.graphics();
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
