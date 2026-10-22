import Phaser from 'phaser';

interface FighterStatusElements {
  hpFill: Phaser.GameObjects.Graphics;
  mpFill: Phaser.GameObjects.Graphics;
  hpText: Phaser.GameObjects.Text;
  mpText: Phaser.GameObjects.Text;
  x: number;
}

export function updateFighterStatus(
  elements: FighterStatusElements,
  hp: number,
  mp: number,
  maxHp = 500,
  maxMp = 500
): void {
  const barWidth = 178;
  const barHeight = 12;
  const hpRatio = Math.max(0, Math.min(1, hp / maxHp));
  const mpRatio = Math.max(0, Math.min(1, mp / maxMp));

  elements.hpFill.clear();
  elements.hpFill.fillStyle(0xd9534f, 1);
  elements.hpFill.fillRect(elements.x, 33, barWidth * hpRatio, barHeight);

  elements.mpFill.clear();
  elements.mpFill.fillStyle(0x0275d8, 1);
  elements.mpFill.fillRect(elements.x, 51, barWidth * mpRatio, barHeight);

  elements.hpText.setText(`HP ${Math.round(hp)}/${maxHp}`);
  elements.mpText.setText(`MP ${Math.round(mp)}/${maxMp}`);
}
