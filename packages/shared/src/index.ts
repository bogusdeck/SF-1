export * from './types/character';
export * from './types/simulation';
export * from './input/InputBuffer';
export * from './simulation/GameSimulation';
export * from './schema/RoomState';

import davisJson from './data/characters/davis.json';
import dennisJson from './data/characters/dennis.json';
import type { CharacterData } from './types/character';

export const davisData = davisJson as unknown as CharacterData;
export const dennisData = dennisJson as unknown as CharacterData;

export const TICK_RATE = 30;
export const MS_PER_TICK = 1000 / TICK_RATE;
export const GRAVITY = 1.2;


