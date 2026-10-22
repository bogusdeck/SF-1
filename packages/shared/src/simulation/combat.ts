import type { CharacterData, Hitbox } from '../types/character';
import type { GameSimulationState, PlayerSimulationState } from '../types/simulation';
import { boxesIntersect, toWorldBox } from './collision';

function transitionToFrame(player: PlayerSimulationState, frameId: number): void {
  player.frameId = frameId;
  player.frameTick = 0;
}

function applyHit(
  attacker: PlayerSimulationState,
  victim: PlayerSimulationState,
  hit: Hitbox
): void {
  const isDefending = victim.frameId === 110 || victim.frameId === 111;

  if (isDefending) {
    const damage = Math.max(1, Math.round(hit.damage * 0.25));
    victim.hp = Math.max(0, victim.hp - damage);
    victim.vx = attacker.facing * Math.round(hit.knockbackX * 0.35);
    victim.frameId = 111;
    victim.frameTick = 0;
    return;
  }

  victim.hp = Math.max(0, victim.hp - hit.damage);
  victim.fallPoints += hit.fall || 20;

  if (victim.hp <= 0) {
    victim.isDead = true;
    transitionToFrame(victim, 180);
    victim.vy = 10;
    victim.vx = -attacker.facing * 7;
    victim.isGrounded = false;
  } else if (victim.fallPoints >= 50 || (hit.fall && hit.fall >= 40)) {
    transitionToFrame(victim, 180);
    victim.vy = 9;
    victim.vx = -attacker.facing * 6;
    victim.isGrounded = false;
    victim.fallPoints = 0;
  } else {
    transitionToFrame(victim, 220);
    victim.vx = attacker.facing * Math.min(8, hit.knockbackX || 4);
  }
}

export function updateMeleeCombat(
  state: GameSimulationState,
  characterConfigs: ReadonlyMap<string, CharacterData>
): void {
  const players = Object.values(state.players);

  for (let i = 0; i < players.length; i++) {
    const attacker = players[i];
    if (attacker.isDead) continue;

    const attackerCharacter = characterConfigs.get(attacker.character.toLowerCase());
    const attackerFrame = attackerCharacter?.frames[attacker.frameId];
    if (!attackerFrame?.itr?.length) continue;

    const attackId = `${attacker.id}_${attacker.frameId}_${attacker.frameTick}`;

    for (let j = 0; j < players.length; j++) {
      if (i === j) continue;

      const victim = players[j];
      if (
        victim.isDead ||
        victim.invincibleTicks > 0 ||
        victim.lastHitByAttackId === attackId ||
        Math.abs(attacker.z - victim.z) > 16
      ) {
        continue;
      }

      const victimCharacter = characterConfigs.get(victim.character.toLowerCase());
      const victimFrame = victimCharacter?.frames[victim.frameId];
      if (!victimFrame?.bdy?.length) continue;

      let matchedHitbox: Hitbox | undefined;
      for (const hitbox of attackerFrame.itr) {
        const attackBox = toWorldBox(attacker, attackerFrame, hitbox);
        if (
          victimFrame.bdy.some((hurtbox) =>
            boxesIntersect(attackBox, toWorldBox(victim, victimFrame, hurtbox))
          )
        ) {
          matchedHitbox = hitbox;
          break;
        }
      }

      if (matchedHitbox) {
        victim.lastHitByAttackId = attackId;
        applyHit(attacker, victim, matchedHitbox);
      }
    }
  }
}
