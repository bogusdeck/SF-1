import { describe, it, expect, beforeEach } from 'vitest';
import { GameSimulation } from '../simulation/GameSimulation';
import davisData from '../data/characters/davis.json';
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

describe('GameSimulation Determinism & 2.5D Mechanics', () => {
  let sim: GameSimulation;
  const davis = davisData as unknown as CharacterData;

  beforeEach(() => {
    sim = new GameSimulation({ minX: 50, maxX: 750, minZ: 310, maxZ: 435 });
    sim.registerCharacter(davis);
    sim.addPlayer('p1', 'Davis', 400, 360, 1);
  });

  it('should initialize player on the ground plane at specified coordinates', () => {
    const player = sim.getPlayer('p1')!;
    expect(player.x).toBe(400);
    expect(player.y).toBe(0);
    expect(player.z).toBe(360);
    expect(player.isGrounded).toBe(true);
    expect(player.hp).toBe(500);
    expect(player.mp).toBe(500);
  });

  it('should walk in 2.5D (x and z) when arrow keys are pressed', () => {
    const input: InputState = { ...emptyInput, right: true, down: true };

    // Update for 5 ticks
    for (let i = 0; i < 5; i++) {
      sim.update({ p1: input });
    }

    const player = sim.getPlayer('p1')!;
    expect(player.x).toBeGreaterThan(400);
    expect(player.z).toBeGreaterThan(360);
    expect(player.y).toBe(0); // Grounded
    expect(player.facing).toBe(1);
  });

  it('should trigger running on double-tap forward', () => {
    const rightPress: InputState = { ...emptyInput, right: true };

    // Tap right (tick 1)
    sim.update({ p1: rightPress });
    // Release (tick 2)
    sim.update({ p1: emptyInput });
    // Tap right again (tick 3)
    sim.update({ p1: rightPress });

    const player = sim.getPlayer('p1')!;
    expect(player.frameId).toBe(9); // Frame 9 is running
    expect(player.vx).toBe(davis.stats.runSpeed);
  });

  it('should perform a parabolic jump governed by gravity and land cleanly', () => {
    const jumpInput: InputState = { ...emptyInput, jump: true };

    // Initiate jump
    sim.update({ p1: jumpInput });
    const pAfterJump = sim.getPlayer('p1')!;
    expect(pAfterJump.isGrounded).toBe(false);
    expect(pAfterJump.vy).toBeCloseTo(davis.stats.jumpHeight - 1.2, 2);
    expect(pAfterJump.y).toBeGreaterThan(0);

    // Let the jump play out for 35 ticks until landing
    for (let i = 0; i < 35; i++) {
      sim.update({ p1: emptyInput });
    }

    const pLanded = sim.getPlayer('p1')!;
    expect(pLanded.y).toBe(0);
    expect(pLanded.isGrounded).toBe(true);
    expect(pLanded.vy).toBe(0);
  });

  it('should execute D + F + A combo and consume 50 MP', () => {
    // Hold defend
    sim.update({ p1: { ...emptyInput, defend: true } });
    // Hold defend + forward
    sim.update({ p1: { ...emptyInput, defend: true, right: true } });
    // Defend + forward + attack
    sim.update({ p1: { ...emptyInput, defend: true, right: true, attack: true } });

    const player = sim.getPlayer('p1')!;
    expect(player.frameId).toBe(240); // Special move frame
    expect(player.mp).toBe(450); // 500 - 50 MP
  });

  it('should remain bit-for-bit deterministic across multiple runs with identical inputs', () => {
    const simA = new GameSimulation();
    simA.registerCharacter(davis);
    simA.addPlayer('p1', 'Davis', 400, 360, 1);

    const simB = new GameSimulation();
    simB.registerCharacter(davis);
    simB.addPlayer('p1', 'Davis', 400, 360, 1);

    const script: InputState[] = [
      { ...emptyInput, right: true },
      { ...emptyInput, right: true },
      { ...emptyInput },
      { ...emptyInput, right: true }, // Double tap run
      { ...emptyInput, right: true },
      { ...emptyInput, right: true, jump: true }, // Dash jump
      { ...emptyInput, attack: true }, // Jump attack
      { ...emptyInput },
      { ...emptyInput },
      { ...emptyInput, defend: true },
      { ...emptyInput, defend: true, right: true, attack: true },
    ];

    for (const inp of script) {
      simA.update({ p1: inp });
      simB.update({ p1: inp });
    }

    const stateA = simA.getPlayer('p1')!;
    const stateB = simB.getPlayer('p1')!;

    expect(stateA.x).toBe(stateB.x);
    expect(stateA.y).toBe(stateB.y);
    expect(stateA.z).toBe(stateB.z);
    expect(stateA.vx).toBe(stateB.vx);
    expect(stateA.vy).toBe(stateB.vy);
    expect(stateA.frameId).toBe(stateB.frameId);
    expect(stateA.hp).toBe(stateB.hp);
    expect(stateA.mp).toBe(stateB.mp);
  });
});
