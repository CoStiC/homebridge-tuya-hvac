import type { HvacState } from './hvac-state.js';

export interface HvacGateway {
  getState(): Promise<HvacState>;
  setActive(active: boolean): Promise<HvacState>;
}
