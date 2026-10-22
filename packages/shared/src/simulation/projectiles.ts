import type {
  GameSimulationState,
  ProjectileSimulationState,
} from '../types/simulation';

export function createProjectile(
  state: GameSimulationState,
  ownerId: string,
  x: number,
  y: number,
  z: number,
  vx: number,
  facing: 1 | -1,
  damage = 35
): ProjectileSimulationState {
  const projectile: ProjectileSimulationState = {
    id: `proj_${state.tick}_${ownerId}`,
    ownerId,
    x,
    y,
    z,
    vx,
    vy: 0,
    vz: 0,
    facing,
    frameId: 0,
    frameTick: 0,
    damage,
    ttl: 60,
  };

  state.projectiles.push(projectile);
  return projectile;
}

export function updateProjectiles(state: GameSimulationState): void {
  const alive: ProjectileSimulationState[] = [];

  for (let i = 0; i < state.projectiles.length; i++) {
    const projectile = state.projectiles[i];
    projectile.x += projectile.vx;
    projectile.ttl--;

    if (projectile.x < 30 || projectile.x > 770 || projectile.ttl <= 0) {
      continue;
    }

    let clashing = false;
    for (let j = 0; j < state.projectiles.length; j++) {
      if (i === j) continue;

      const other = state.projectiles[j];
      if (
        projectile.ownerId !== other.ownerId &&
        Math.abs(projectile.x - other.x) < 28 &&
        Math.abs(projectile.z - other.z) < 16 &&
        Math.abs(projectile.y - other.y) < 25
      ) {
        clashing = true;
        other.ttl = 0;
        break;
      }
    }

    if (clashing) continue;

    let hitPlayer = false;
    for (const player of Object.values(state.players)) {
      if (
        player.id === projectile.ownerId ||
        player.isDead ||
        player.invincibleTicks > 0
      ) {
        continue;
      }

      if (
        Math.abs(projectile.x - player.x) < 26 &&
        Math.abs(projectile.z - player.z) <= 16 &&
        Math.abs(projectile.y - (player.y + 35)) < 30
      ) {
        hitPlayer = true;
        player.hp = Math.max(0, player.hp - projectile.damage);
        player.isDead = player.hp <= 0;
        player.frameId = 180;
        player.frameTick = 0;
        player.vy = 8;
        player.vx = -projectile.facing * 5;
        player.isGrounded = false;
        break;
      }
    }

    if (!hitPlayer) {
      alive.push(projectile);
    }
  }

  state.projectiles = alive;
}
