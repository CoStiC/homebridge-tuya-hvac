import { describe, expect, it } from 'vitest';

import { HvacMode } from '../../src/domain/hvac-mode.js';
import { mapIvwInverter10DpsToState } from '../../src/tuya/ivw-inverter-10-profile.js';

describe('mapIvwInverter10DpsToState', () => {
  it('traduit les DP1 à DP4 en état HVAC', () => {
    const state = mapIvwInverter10DpsToState({
      '1': false,
      '2': 30,
      '3': 29,
      '4': 'auto',
      '13': 0,
    });

    expect(state).toEqual({
      active: false,
      targetTemperature: 30,
      currentTemperature: 29,
      mode: HvacMode.Auto,
    });
  });

  it('rejette un mode inconnu', () => {
    expect(() =>
      mapIvwInverter10DpsToState({
        '1': false,
        '2': 30,
        '3': 29,
        '4': 'unsupported',
      }),
    ).toThrow('mode inconnu');
  });

  it('rejette un DP obligatoire absent ou mal typé', () => {
    expect(() =>
      mapIvwInverter10DpsToState({
        '1': 'false',
        '2': 30,
        '3': 29,
        '4': 'auto',
      }),
    ).toThrow('booléen attendu');
  });
});
