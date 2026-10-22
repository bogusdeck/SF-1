import type { InputState } from '../types/simulation';

export interface TimestampedInput {
  tick: number;
  input: InputState;
  // Edge transitions (pressed this tick)
  justPressed: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    attack: boolean;
    jump: boolean;
    defend: boolean;
  };
}

export class InputBuffer {
  private buffer: TimestampedInput[] = [];
  private readonly maxTicks: number;

  constructor(maxTicks = 20) {
    this.maxTicks = maxTicks;
  }

  public push(tick: number, input: InputState): void {
    const prev = this.buffer.length > 0 ? this.buffer[this.buffer.length - 1].input : null;

    const justPressed = {
      up: input.up && (!prev || !prev.up),
      down: input.down && (!prev || !prev.down),
      left: input.left && (!prev || !prev.left),
      right: input.right && (!prev || !prev.right),
      attack: input.attack && (!prev || !prev.attack),
      jump: input.jump && (!prev || !prev.jump),
      defend: input.defend && (!prev || !prev.defend),
    };

    this.buffer.push({
      tick,
      input: { ...input },
      justPressed,
    });

    if (this.buffer.length > this.maxTicks) {
      this.buffer.shift();
    }
  }

  public getLatest(): TimestampedInput | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  /**
   * Check if direction (left or right) was double-tapped within `windowTicks` ticks.
   * Pattern: Tap direction -> Release -> Tap direction again.
   */
  public isDoubleTap(dir: 'left' | 'right', windowTicks = 12): boolean {
    if (this.buffer.length < 3) return false;
    const latest = this.buffer[this.buffer.length - 1];
    if (!latest.justPressed[dir]) return false;

    // Look back in the buffer for a release, followed by another tap of the same direction
    let foundRelease = false;
    const startTick = latest.tick;

    for (let i = this.buffer.length - 2; i >= 0; i--) {
      const entry = this.buffer[i];
      if (startTick - entry.tick > windowTicks) break;

      if (!entry.input[dir]) {
        foundRelease = true;
      } else if (foundRelease && entry.justPressed[dir]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for LF2 style combos: Defend + Direction + Attack/Jump within `windowTicks` ticks.
   * e.g., Defend + Forward + Attack (D_F_A), Defend + Up + Jump (D_U_J), etc.
   */
  public checkCombo(
    facing: 1 | -1,
    combo: 'D_F_A' | 'D_B_A' | 'D_U_A' | 'D_D_A' | 'D_U_J' | 'D_D_J',
    windowTicks = 14
  ): boolean {
    if (this.buffer.length < 2) return false;
    const latest = this.buffer[this.buffer.length - 1];

    const forwardKey = facing === 1 ? 'right' : 'left';
    const backKey = facing === 1 ? 'left' : 'right';

    // Must trigger on the final button press
    const isAttackCombo = combo.endsWith('_A');
    const isJumpCombo = combo.endsWith('_J');

    if (isAttackCombo && !latest.justPressed.attack) return false;
    if (isJumpCombo && !latest.justPressed.jump) return false;

    let targetDir: 'up' | 'down' | 'left' | 'right' = 'right';
    if (combo.startsWith('D_F_')) targetDir = forwardKey;
    else if (combo.startsWith('D_B_')) targetDir = backKey;
    else if (combo.startsWith('D_U_')) targetDir = 'up';
    else if (combo.startsWith('D_D_')) targetDir = 'down';

    // Verify defend and target direction occurred prior to this final action
    let foundDefend = false;
    let foundDir = false;
    const currentTick = latest.tick;

    for (let i = this.buffer.length - 1; i >= 0; i--) {
      const entry = this.buffer[i];
      if (currentTick - entry.tick > windowTicks) break;

      if (entry.input.defend || entry.justPressed.defend) {
        foundDefend = true;
      }
      if (entry.input[targetDir] || entry.justPressed[targetDir]) {
        foundDir = true;
      }
    }

    return foundDefend && foundDir;
  }

  public clear(): void {
    this.buffer = [];
  }
}
