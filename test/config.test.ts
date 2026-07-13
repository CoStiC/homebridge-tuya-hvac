import { describe, expect, it } from 'vitest';

import { validateConfig } from '../src/config.js';

const baseConfig = {
  name: 'Piscine',
  deviceId: 'device-id',
  ip: '192.0.2.1',
  localKey: 'local-key',
  platform: 'TuyaHvac',
  protocolVersion: '3.5',
};

describe('validateConfig', () => {
  it('utilise un intervalle de rafraîchissement de 30 secondes par défaut', () => {
    expect(validateConfig(baseConfig)).toMatchObject({ refreshIntervalSeconds: 30 });
  });

  it('accepte un intervalle de rafraîchissement configurable', () => {
    expect(validateConfig({ ...baseConfig, refreshIntervalSeconds: 60 })).toMatchObject({
      refreshIntervalSeconds: 60,
    });
  });

  it.each([4, 3601, 30.5, '30'])(
    'rejette l’intervalle de rafraîchissement invalide %s',
    (refreshIntervalSeconds) => {
      expect(() => validateConfig({ ...baseConfig, refreshIntervalSeconds })).toThrow(
        'refreshIntervalSeconds doit être un entier entre 5 et 3600',
      );
    },
  );
});
