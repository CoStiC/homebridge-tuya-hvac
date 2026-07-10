import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';

import { validateConfig } from './config.js';
import type { TuyaHvacPlatformConfig } from './config.js';
import { HeaterCoolerAccessory } from './homekit/heater-cooler-accessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

export class TuyaHvacPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly config: TuyaHvacPlatformConfig;

  private readonly accessories = new Map<string, PlatformAccessory>();

  public constructor(
    public readonly log: Logging,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.config = validateConfig(config);

    this.api.on('didFinishLaunching', () => {
      this.registerAccessory();
    });
  }

  public configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Accessoire restauré depuis le cache : %s', accessory.displayName);

    this.accessories.set(accessory.UUID, accessory);
  }

  private registerAccessory(): void {
    const uuid = this.api.hap.uuid.generate(this.config.deviceId);
    const existingAccessory = this.accessories.get(uuid);

    if (existingAccessory) {
      this.log.info('Réutilisation de l’accessoire existant : %s', existingAccessory.displayName);

      new HeaterCoolerAccessory(this, existingAccessory);
      return;
    }

    const accessory = new this.api.platformAccessory(this.config.name, uuid);

    accessory.context.deviceId = this.config.deviceId;

    new HeaterCoolerAccessory(this, accessory);

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

    this.log.info('Nouvel accessoire enregistré : %s', accessory.displayName);
  }
}
