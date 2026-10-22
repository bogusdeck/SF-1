import { describe, it, expect, beforeEach } from 'vitest';
import { GameSimulation } from '../simulation/GameSimulation';
import davisData from '../data/characters/davis.json';
import dennisData from '../data/characters/dennis.json';
import type { CharacterData } from '../types/character';
import type { InputState } from '../types/simulation';

const emptyInput: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  attack: false,
  jump: false,
  defend: false,
};

describe('Phase 3 Combat, Damage, Knockdowns & Projectiles', () => {
  let sim: GameSimulation;
  const davis = davisData as unknown as CharacterData;
  const dennis = dennisData as unknown as CharacterData;

  beforeEach(() => {
    sim = new GameSimulation({ minX: 60, maxX: 740, minZ: 310, maxZ: 435 });
    sim.registerCharacter(davis);
    sim.registerCharacter(dennis);

    // Place Davis and Dennis face-to-face in the center ring
    sim.addPlayer('p1', 'Davis', 380, 360, 1);
    sim.addPlayer('p2', 'Dennis', 420, 360, -1);
  });

  it('should detect melee hit and reduce opponent HP when in range', () => {
    const p2Before = sim.getPlayer('p2')!;
    expect(p2Before.hp).toBe(500);

    // P1 punches (frame 60 -> 61 has active hitbox)
    sim.update({
      p1: { ...emptyInput, attack: true },
      p2: emptyInput,
    });
    sim.update({
      p1: emptyInput,
      p2: emptyInput,
    });

    const p2After = sim.getPlayer('p2')!;
    expect(p2After.hp).toBeLessThan(500);
    expect(p2After.frameId).toBe(220); // Injured / flinch frame
  });

  it('should miss when opponent is on a different 2.5D depth lane (Z distance > 16)', () => {
    const p2 = sim.getPlayer('p2')!;
    p2.z = 390; // Depth difference = 30px (greater than 16px threshold)

    // P1 punches
    sim.update({
      p1: { ...emptyInput, attack: true },
      p2: emptyInput,
    });
    sim.update({
      p1: emptyInput,
      p2: emptyInput,
    });

    const p2After = sim.getPlayer('p2')!;
    expect(p2After.hp).toBe(500); // No damage taken
    expect(p2After.frameId).toBe(0); // Remained standing
  });

  it('should reduce damage by 75% when opponent is defending', () => {
    const p2 = sim.getPlayer('p2')!;
    p2.frameId = 110; // Defending guard pose

    // P1 punches
    sim.update({
      p1: { ...emptyInput, attack: true },
      p2: { ...emptyInput, defend: true },
    });
    // On the tick of hit impact while guarding, player enters defend recoil (frame 111)
    expect(sim.getPlayer('p2')!.frameId).toBe(111);

    sim.update({
      p1: emptyInput,
      p2: { ...emptyInput, defend: true },
    });

    const p2After = sim.getPlayer('p2')!;
    // Normal damage is 20. Blocked damage is max(1, round(20 * 0.25)) = 5
    expect(p2After.hp).toBe(495);
    expect(p2After.frameId).toBe(110); // Recovered back to guard pose
    expect(p2After.isGrounded).toBe(true);
  });

  it('should cause knockdown on heavy attack or cumulative fall points', () => {
    const p2 = sim.getPlayer('p2')!;

    // Directly trigger heavy hit by simulating high fall points
    p2.fallPoints = 40;

    sim.update({
      p1: { ...emptyInput, attack: true },
      p2: emptyInput,
    });
    sim.update({
      p1: emptyInput,
      p2: emptyInput,
    });

    const p2After = sim.getPlayer('p2')!;
    expect(p2After.frameId).toBe(180); // Knockdown falling tumble
    expect(p2After.isGrounded).toBe(false);
    expect(p2After.vy).toBeGreaterThan(0); // Knocked upward
  });

  it('should land in lying state and grant temporary invincibility', () => {
    const p2 = sim.getPlayer('p2')!;
    p2.frameId = 180;
    p2.isGrounded = false;
    p2.y = 5;
    p2.vy = -10; // Falling toward ground

    sim.update({ p1: emptyInput, p2: emptyInput });

    const p2Landed = sim.getPlayer('p2')!;
    expect(p2Landed.y).toBe(0);
    expect(p2Landed.frameId).toBe(230); // Lying on the ground
    expect(p2Landed.invincibleTicks).toBeGreaterThan(0);
  });

  it('should fire energy projectile via D+F+A and hit opponent', () => {
    const p2 = sim.getPlayer('p2')!;
    p2.x = 520; // Place opponent at distance to observe in-flight projectile

    // P1 performs D+F+A combo
    sim.update({ p1: { ...emptyInput, defend: true }, p2: emptyInput });
    sim.update({ p1: { ...emptyInput, defend: true, right: true }, p2: emptyInput });
    sim.update({ p1: { ...emptyInput, defend: true, right: true, attack: true }, p2: emptyInput });

    const state = sim.getState();
    expect(state.projectiles.length).toBe(1);
    expect(state.projectiles[0].ownerId).toBe('p1');
    expect(state.projectiles[0].vx).toBeGreaterThan(0);

    // Let the projectile fly toward P2 (from ~426 to 520 at vx=11)
    for (let i = 0; i < 15; i++) {
      sim.update({ p1: emptyInput, p2: emptyInput });
    }

    const p2After = sim.getPlayer('p2')!;
    expect(p2After.hp).toBe(465); // 500 - 35 projectile damage
    expect(p2After.isGrounded).toBe(false); // Knockdown from blast
  });

  it('should cancel and destroy opposing projectiles upon collision', () => {
    // Spawn projectile from P1 moving right
    sim.spawnProjectile('p1', 300, 35, 360, 10, 1);
    // Spawn projectile from P2 moving left toward P1
    sim.spawnProjectile('p2', 340, 35, 360, -10, -1);

    expect(sim.getState().projectiles.length).toBe(2);

    // Update 2 ticks so they collide
    sim.update({ p1: emptyInput, p2: emptyInput });
    sim.update({ p1: emptyInput, p2: emptyInput });

    // Both projectiles clash and cancel out
    expect(sim.getState().projectiles.length).toBe(0);
  });
});
