import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';

import { HvacController } from './application/hvac-controller.js';
import { validateConfig } from './config.js';
import type { TuyaHvacPlatformConfig } from './config.js';
import { HeaterCoolerAccessory } from './homekit/heater-cooler-accessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { TuyaClient } from './tuya/tuya-client.js';
import { TuyaHvacGateway } from './tuya/tuya-hvac-gateway.js';

export class TuyaHvacPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly config: TuyaHvacPlatformConfig;

  private readonly accessories = new Map<string, PlatformAccessory>();
  private readonly accessoryHandlers = new Set<HeaterCoolerAccessory>();

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

    this.api.on('shutdown', () => {
      this.shutdown();
    });
  }

  public configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Accessoire restauré depuis le cache : %s', accessory.displayName);

    this.accessories.set(accessory.UUID, accessory);
  }

  private registerAccessory(): void {
    const uuid = this.api.hap.uuid.generate(this.config.deviceId);
    const existingAccessory = this.accessories.get(uuid);
    const controller = this.createController();

    if (existingAccessory) {
      this.log.info('Réutilisation de l’accessoire existant : %s', existingAccessory.displayName);

      this.accessoryHandlers.add(new HeaterCoolerAccessory(this, existingAccessory, controller));
      return;
    }

    const accessory = new this.api.platformAccessory(this.config.name, uuid);

    accessory.context.deviceId = this.config.deviceId;

    this.accessoryHandlers.add(new HeaterCoolerAccessory(this, accessory, controller));

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

    this.log.info('Nouvel accessoire enregistré : %s', accessory.displayName);
  }

  private shutdown(): void {
    for (const handler of this.accessoryHandlers) {
      handler.shutdown();
    }

    this.accessoryHandlers.clear();
  }

  private createController(): HvacController {
    const client = new TuyaClient({
      deviceId: this.config.deviceId,
      localKey: this.config.localKey,
      ip: this.config.ip,
      protocolVersion: this.config.protocolVersion,
    });

    const gateway = new TuyaHvacGateway(client);

    return new HvacController(gateway);
  }
}
