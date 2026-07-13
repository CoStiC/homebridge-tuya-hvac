import type { HvacState } from './hvac-state.js';
import type { HvacMode } from './hvac-mode.js';

export interface HvacGateway {
  getState(): Promise<HvacState>;
  setActive(active: boolean): Promise<HvacState>;
  setMode(mode: HvacMode): Promise<HvacState>;
}
