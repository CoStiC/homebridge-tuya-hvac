import { describe, expect, it } from 'vitest';

import { HvacMode } from '../../src/domain/hvac-mode.js';
import type { HvacState } from '../../src/domain/hvac-state.js';

describe('HvacState', () => {
  it('représente un état HVAC indépendant de Tuya et HomeKit', () => {
    const state: HvacState = {
      active: true,
      currentTemperature: 27,
      targetTemperature: 30,
      mode: HvacMode.Heat,
    };

    expect(state).toEqual({
      active: true,
      currentTemperature: 27,
      targetTemperature: 30,
      mode: 'heat',
    });
  });
});
