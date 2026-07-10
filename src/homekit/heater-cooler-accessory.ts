import type { PlatformAccessory, Service } from 'homebridge';

import type { TuyaHvacPlatform } from '../platform.js';

export class HeaterCoolerAccessory {
  private readonly service: Service;

  public constructor(
    private readonly platform: TuyaHvacPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'IVW')
      .setCharacteristic(this.platform.Characteristic.Model, 'Inverter 10')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.deviceId);

    this.service =
      this.accessory.getService(this.platform.Service.HeaterCooler) ??
      this.accessory.addService(this.platform.Service.HeaterCooler, this.accessory.displayName);

    this.service
      .setCharacteristic(this.platform.Characteristic.Name, this.accessory.displayName)
      .setCharacteristic(
        this.platform.Characteristic.Active,
        this.platform.Characteristic.Active.INACTIVE,
      )
      .setCharacteristic(
        this.platform.Characteristic.CurrentHeaterCoolerState,
        this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE,
      )
      .setCharacteristic(
        this.platform.Characteristic.TargetHeaterCoolerState,
        this.platform.Characteristic.TargetHeaterCoolerState.AUTO,
      )
      .setCharacteristic(this.platform.Characteristic.CurrentTemperature, 20);
  }
}
