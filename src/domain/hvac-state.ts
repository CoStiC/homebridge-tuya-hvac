import type { HvacMode } from './hvac-mode.js';

export interface HvacState {
  readonly active: boolean;
  readonly currentTemperature: number;
  readonly targetTemperature: number;
  readonly mode: HvacMode;
}
