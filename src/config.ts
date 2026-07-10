import type { PlatformConfig } from 'homebridge';

export interface TuyaHvacPlatformConfig extends PlatformConfig {
  name: string;
  deviceId: string;
  ip: string;
  localKey: string;
  protocolVersion: '3.5';
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

  return config as TuyaHvacPlatformConfig;
}
