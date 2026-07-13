import type { PlatformAccessory, Service } from 'homebridge';

import type { HvacController } from '../application/hvac-controller.js';
import { HvacMode } from '../domain/hvac-mode.js';
import type { HvacState } from '../domain/hvac-state.js';
import type { TuyaHvacPlatform } from '../platform.js';

export class HeaterCoolerAccessory {
  private readonly service: Service;
  private activeRequestId = 0;
  private activeWorkerRunning = false;
  private pendingActiveRequest:
    { readonly active: boolean; readonly requestId: number } | undefined;

  public constructor(
    private readonly platform: TuyaHvacPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly controller: HvacController,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'IVW')
      .setCharacteristic(this.platform.Characteristic.Model, 'Inverter 10')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.config.deviceId);

    this.service =
      this.accessory.getService(this.platform.Service.HeaterCooler) ??
      this.accessory.addService(this.platform.Service.HeaterCooler, this.accessory.displayName);

    const heatingThreshold = this.service.getCharacteristic(
      this.platform.Characteristic.HeatingThresholdTemperature,
    );

    heatingThreshold.updateValue(8);
    heatingThreshold.setProps({
      minValue: 8,
      maxValue: 32,
      minStep: 1,
    });

    const coolingThreshold = this.service.getCharacteristic(
      this.platform.Characteristic.CoolingThresholdTemperature,
    );

    coolingThreshold.updateValue(8);
    coolingThreshold.setProps({
      minValue: 8,
      maxValue: 32,
      minStep: 1,
    });

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
      );

    this.service.getCharacteristic(this.platform.Characteristic.Active).onSet((value) => {
      const active = value === this.platform.api.hap.Characteristic.Active.ACTIVE;
      const requestId = ++this.activeRequestId;
      this.platform.log.info('[#%d] Commande Active reçue → %s.', requestId, active ? 'ON' : 'OFF');
      void this.setActiveInBackground(active, requestId);
    });

    void this.refreshState();
  }

  private async refreshState(): Promise<void> {
    try {
      const state = await this.controller.getState();

      this.applyState(state);

      this.platform.log.info(
        'État initial synchronisé : active=%s, température=%s °C, consigne=%s °C, mode=%s',
        state.active,
        state.currentTemperature,
        state.targetTemperature,
        state.mode,
      );
    } catch (error) {
      this.platform.log.error(
        'Impossible de lire l’état initial de la PAC : %s',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async setActiveInBackground(active: boolean, requestId: number): Promise<void> {
    this.pendingActiveRequest = { active, requestId };

    if (this.activeWorkerRunning) {
      return;
    }

    this.activeWorkerRunning = true;

    try {
      while (this.pendingActiveRequest !== undefined) {
        const request = this.pendingActiveRequest;

        this.pendingActiveRequest = undefined;

        await this.processActiveRequest(request.active, request.requestId);
      }
    } finally {
      this.activeWorkerRunning = false;
    }
  }

  private async processActiveRequest(active: boolean, requestId: number): Promise<void> {
    try {
      const state = await this.controller.setActive(active);
      const pendingRequest = this.pendingActiveRequest;

      if (pendingRequest?.active === state.active) {
        this.pendingActiveRequest = undefined;
        this.applyConfirmedActiveState(state, pendingRequest.requestId);
      } else if (requestId === this.activeRequestId) {
        this.applyConfirmedActiveState(state, requestId);
      } else {
        this.platform.log.debug('[#%d] Résultat Active obsolète ignoré.', requestId);
      }
    } catch (error) {
      this.platform.log.error(
        '[#%d] Impossible de modifier l’état de la PAC : %s',
        requestId,
        error instanceof Error ? error.message : String(error),
      );

      if (requestId !== this.activeRequestId || this.pendingActiveRequest !== undefined) {
        this.platform.log.debug('[#%d] Resynchronisation obsolète ignorée.', requestId);
        return;
      }

      await this.restoreActiveStateAfterFailure(requestId);
    }
  }

  private applyConfirmedActiveState(state: HvacState, requestId: number): void {
    this.applyState(state);
    this.platform.log.info(
      '[#%d] Commande Active → %s confirmée.',
      requestId,
      state.active ? 'ON' : 'OFF',
    );
  }

  private async restoreActiveStateAfterFailure(requestId: number): Promise<void> {
    try {
      const actualState = await this.controller.getState();

      if (requestId !== this.activeRequestId || this.pendingActiveRequest !== undefined) {
        this.platform.log.debug('[#%d] État restauré obsolète ignoré.', requestId);
        return;
      }

      this.applyState(actualState);
      this.platform.log.info(
        '[#%d] État réel restauré après échec : active=%s.',
        requestId,
        actualState.active,
      );
    } catch (refreshError) {
      this.platform.log.error(
        '[#%d] Impossible de resynchroniser l’état après échec : %s',
        requestId,
        refreshError instanceof Error ? refreshError.message : String(refreshError),
      );
    }
  }

  private applyState(state: HvacState): void {
    this.service
      .updateCharacteristic(
        this.platform.Characteristic.Active,
        state.active
          ? this.platform.Characteristic.Active.ACTIVE
          : this.platform.Characteristic.Active.INACTIVE,
      )
      .updateCharacteristic(
        this.platform.Characteristic.CurrentTemperature,
        state.currentTemperature,
      )
      .updateCharacteristic(
        this.platform.Characteristic.HeatingThresholdTemperature,
        state.targetTemperature,
      )
      .updateCharacteristic(
        this.platform.Characteristic.CoolingThresholdTemperature,
        state.targetTemperature,
      )
      .updateCharacteristic(
        this.platform.Characteristic.TargetHeaterCoolerState,
        this.toTargetHeaterCoolerState(state.mode),
      )
      .updateCharacteristic(
        this.platform.Characteristic.CurrentHeaterCoolerState,
        state.active
          ? this.platform.Characteristic.CurrentHeaterCoolerState.IDLE
          : this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE,
      );
  }

  private toTargetHeaterCoolerState(mode: HvacMode): number {
    switch (mode) {
      case HvacMode.Auto:
        return this.platform.Characteristic.TargetHeaterCoolerState.AUTO;

      case HvacMode.Heat:
      case HvacMode.PowerfulHeat:
      case HvacMode.SilentHeat:
        return this.platform.Characteristic.TargetHeaterCoolerState.HEAT;

      case HvacMode.Cool:
      case HvacMode.PowerfulCool:
      case HvacMode.SilentCool:
        return this.platform.Characteristic.TargetHeaterCoolerState.COOL;
    }
  }
}
