import type { PlatformConfig } from 'homebridge';

export interface TuyaHvacPlatformConfig extends PlatformConfig {
  name: string;
  deviceId: string;
  ip: string;
  localKey: string;
  protocolVersion: '3.5';
  refreshIntervalSeconds: number;
}

export function validateConfig(config: PlatformConfig): TuyaHvacPlatformConfig {
  const requiredStringProperties = [
    'name',
    'deviceId',
    'ip',
    'localKey',
    'protocolVersion',
  ] as const;

  for (const property of requiredStringProperties) {
    const value = config[property];

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Configuration invalide : la propriété "${property}" est obligatoire.`);
    }
  }

  if (config.protocolVersion !== '3.5') {
    throw new Error(`Configuration invalide : protocolVersion doit être "3.5".`);
  }

  const refreshIntervalSeconds = config.refreshIntervalSeconds ?? 30;

  if (
    typeof refreshIntervalSeconds !== 'number' ||
    !Number.isInteger(refreshIntervalSeconds) ||
    refreshIntervalSeconds < 5 ||
    refreshIntervalSeconds > 3600
  ) {
    throw new Error(
      'Configuration invalide : refreshIntervalSeconds doit être un entier entre 5 et 3600.',
    );
  }

  return {
    ...config,
    refreshIntervalSeconds,
  } as TuyaHvacPlatformConfig;
}
