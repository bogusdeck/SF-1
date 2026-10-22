import type { CharacterFrame, Hitbox, Hurtbox } from '../types/character';
import type { PlayerSimulationState } from '../types/simulation';

export interface WorldBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function toWorldBox(
  player: PlayerSimulationState,
  frame: CharacterFrame,
  box: Hurtbox | Hitbox
): WorldBox {
  const centerX = frame.centerx ?? 39;
  const centerY = frame.centery ?? 79;

  const minX =
    player.facing === 1
      ? player.x - centerX + box.x
      : player.x + centerX - (box.x + box.w);

  return {
    minX,
    maxX: minX + box.w,
    minY: player.y + (centerY - (box.y + box.h)),
    maxY: player.y + (centerY - box.y),
  };
}

export function boxesIntersect(a: WorldBox, b: WorldBox): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}
