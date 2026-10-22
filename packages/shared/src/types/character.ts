export interface Hurtbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Hitbox {
  x: number;
  y: number;
  w: number;
  h: number;
  damage: number;
  knockbackX: number;
  knockbackY: number;
  fall?: number;
  bdefend?: number;
}

export interface OPoint {
  kind: number;
  x: number;
  y: number;
  action?: number;
  dvx?: number;
  dvy?: number;
  oid?: number;
  facing?: number;
}

export type ActionState =
  | 'standing'
  | 'walking'
  | 'running'
  | 'attacking'
  | 'jumping'
  | 'dash'
  | 'defending'
  | 'injured'
  | 'falling'
  | 'lying'
  | 'crawling'
  | 'special';

export interface CharacterFrame {
  name?: string;
  pic: number;
  wait: number;
  next: number;
  state: ActionState | number;
  dvx?: number;
  dvy?: number;
  dvz?: number;
  centerx?: number;
  centery?: number;
  bdy?: Hurtbox[];
  itr?: Hitbox[];
  opoint?: OPoint[];
  hit_a?: number;
  hit_j?: number;
  hit_d?: number;
  hit_Fa?: number;
  hit_Ua?: number;
  hit_Da?: number;
  hit_Fj?: number;
  hit_Uj?: number;
  hit_Dj?: number;
  hit_ja?: number;
}

export interface CharacterStats {
  hp: number;
  mp: number;
  walkSpeed: number;
  runSpeed: number;
  jumpHeight: number;
}

export interface CharacterData {
  name: string;
  stats: CharacterStats;
  frames: Record<number, CharacterFrame>;
}
