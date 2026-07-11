import { HvacMode } from '../domain/hvac-mode.js';
import type { HvacState } from '../domain/hvac-state.js';

export const IVW_INVERTER_10_PROFILE = {
  dps: {
    active: '1',
    targetTemperature: '2',
    currentTemperature: '3',
    mode: '4',
  },
  targetTemperature: {
    min: 8,
    max: 32,
    step: 1,
  },
} as const;

type TuyaDps = Record<string, unknown>;

function readBoolean(dps: TuyaDps, dp: string): boolean {
  const value = dps[dp];

  if (typeof value !== 'boolean') {
    throw new Error(`DP${dp} invalide : booléen attendu.`);
  }

  return value;
}

function readNumber(dps: TuyaDps, dp: string): number {
  const value = dps[dp];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`DP${dp} invalide : nombre attendu.`);
  }

  return value;
}

function readMode(dps: TuyaDps, dp: string): HvacMode {
  const value = dps[dp];

  if (typeof value !== 'string') {
    throw new Error(`DP${dp} invalide : chaîne attendue.`);
  }

  if (!Object.values(HvacMode).includes(value as HvacMode)) {
    throw new Error(`DP${dp} invalide : mode inconnu "${value}".`);
  }

  return value as HvacMode;
}

export function mapIvwInverter10DpsToState(dps: TuyaDps): HvacState {
  return {
    active: readBoolean(dps, IVW_INVERTER_10_PROFILE.dps.active),
    targetTemperature: readNumber(dps, IVW_INVERTER_10_PROFILE.dps.targetTemperature),
    currentTemperature: readNumber(dps, IVW_INVERTER_10_PROFILE.dps.currentTemperature),
    mode: readMode(dps, IVW_INVERTER_10_PROFILE.dps.mode),
  };
}
