import { describe, it, expect } from 'vitest';
import davisData from '../data/characters/davis.json';
import { TICK_RATE, MS_PER_TICK } from '../index';
import type { CharacterData } from '../types/character';

describe('Character Data Integrity & Determinism', () => {
  const davis = davisData as unknown as CharacterData;

  it('should have valid base statistics for Davis', () => {
    expect(davis.name).toBe('Davis');
    expect(davis.stats.hp).toBe(500);
    expect(davis.stats.mp).toBe(500);
    expect(davis.stats.walkSpeed).toBeGreaterThan(0);
    expect(davis.stats.runSpeed).toBeGreaterThan(davis.stats.walkSpeed);
  });

  it('should contain fundamental animation sequences', () => {
    const frames = davis.frames;

    // Idle sequence
    expect(frames[0]).toBeDefined();
    expect(frames[0].state).toBe('standing');
    expect(frames[0].wait).toBeGreaterThan(0);

    // Walking sequence
    expect(frames[5]).toBeDefined();
    expect(frames[5].state).toBe('walking');

    // Running sequence
    expect(frames[9]).toBeDefined();
    expect(frames[9].state).toBe('running');

    // Attack / Punch sequence
    expect(frames[60]).toBeDefined();
    expect(frames[60].state).toBe('attacking');
    expect(frames[60].next).toBe(61);
  });

  it('should have hurtboxes (bdy) on standing frames', () => {
    const frame0 = davis.frames[0];
    expect(frame0.bdy).toBeDefined();
    expect(frame0.bdy!.length).toBeGreaterThan(0);
    const box = frame0.bdy![0];
    expect(box.w).toBeGreaterThan(0);
    expect(box.h).toBeGreaterThan(0);
  });

  it('should have hitboxes (itr) on attacking frames', () => {
    const punchFrame = davis.frames[60];
    expect(punchFrame.itr).toBeDefined();
    expect(punchFrame.itr!.length).toBeGreaterThan(0);
    const hit = punchFrame.itr![0];
    expect(hit.w).toBeGreaterThan(0);
    expect(hit.h).toBeGreaterThan(0);
    expect(hit.damage).toBeGreaterThan(0);
  });

  it('should verify deterministic 30 TPS timing constants', () => {
    expect(TICK_RATE).toBe(30);
    expect(MS_PER_TICK).toBeCloseTo(33.333, 2);
  });
});
