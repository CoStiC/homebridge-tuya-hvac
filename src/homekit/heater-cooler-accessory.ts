import type { PlatformAccessory, Service } from 'homebridge';

import type { HvacController } from '../application/hvac-controller.js';
import { HvacMode } from '../domain/hvac-mode.js';
import type { HvacState } from '../domain/hvac-state.js';
import type { TuyaHvacPlatform } from '../platform.js';

const UNAVAILABLE_AFTER_FAILURES = 3;

export class HeaterCoolerAccessory {
  private readonly service: Service;
  private readonly refreshTimer: ReturnType<typeof setInterval>;
  private refreshInProgress = false;
  private shutdownRequested = false;
  private initialStateSynchronized = false;
  private consecutiveRefreshFailures = 0;
  private deviceUnavailable = false;
  private activeRequestId = 0;
  private activeWorkerRunning = false;
  private pendingActiveRequest:
    { readonly active: boolean; readonly requestId: number } | undefined;
  private modeRequestId = 0;
  private modeWorkerRunning = false;
  private pendingModeRequest: { readonly mode: HvacMode; readonly requestId: number } | undefined;
  private targetTemperatureRequestId = 0;
  private targetTemperatureWorkerRunning = false;
  private pendingTargetTemperatureRequest:
    { readonly value: number; readonly requestId: number } | undefined;

  public constructor(
    private readonly platform: TuyaHvacPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly controller: HvacController,
    private readonly scheduleInterval: typeof setInterval = setInterval,
    private readonly cancelInterval: typeof clearInterval = clearInterval,
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

    const setTargetTemperature = (value: unknown): void => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`Consigne HomeKit invalide : ${String(value)}.`);
      }

      const requestId = ++this.targetTemperatureRequestId;
      this.platform.log.info('[consigne #%d] Commande reçue → %s °C.', requestId, value);
      void this.setTargetTemperatureInBackground(value, requestId);
    };

    heatingThreshold.onSet(setTargetTemperature);
    coolingThreshold.onSet(setTargetTemperature);

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

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .onSet((value) => {
        const mode = this.fromTargetHeaterCoolerState(value);
        const requestId = ++this.modeRequestId;
        this.platform.log.info('[mode #%d] Commande reçue → %s.', requestId, mode);
        void this.setModeInBackground(mode, requestId);
      });

    void this.refreshStateIfIdle();

    this.refreshTimer = this.scheduleInterval(
      () => void this.refreshStateIfIdle(),
      this.platform.config.refreshIntervalSeconds * 1000,
    );
  }

  public shutdown(): void {
    this.shutdownRequested = true;
    this.cancelInterval(this.refreshTimer);
  }

  private async refreshStateIfIdle(): Promise<void> {
    if (this.shutdownRequested) {
      return;
    }

    if (this.refreshInProgress) {
      this.platform.log.debug('Rafraîchissement ignoré : une lecture est déjà en cours.');
      return;
    }

    this.refreshInProgress = true;

    try {
      const state = await this.controller.getState();

      if (this.shutdownRequested) {
        return;
      }

      this.applyState(state);

      if (this.initialStateSynchronized) {
        this.platform.log.debug(
          'État périodique synchronisé : active=%s, température=%s °C, consigne=%s °C, mode=%s',
          state.active,
          state.currentTemperature,
          state.targetTemperature,
          state.mode,
        );
      } else {
        this.initialStateSynchronized = true;
        this.platform.log.info(
          'État initial synchronisé : active=%s, température=%s °C, consigne=%s °C, mode=%s',
          state.active,
          state.currentTemperature,
          state.targetTemperature,
          state.mode,
        );
      }
    } catch {
      if (!this.shutdownRequested) {
        this.recordRefreshFailure();
      }
    } finally {
      this.refreshInProgress = false;
    }
  }

  private recordRefreshFailure(): void {
    this.consecutiveRefreshFailures += 1;

    if (this.deviceUnavailable) {
      this.platform.log.debug('PAC toujours indisponible ; nouvelle tentative au prochain cycle.');
      return;
    }

    if (this.consecutiveRefreshFailures >= UNAVAILABLE_AFTER_FAILURES) {
      this.deviceUnavailable = true;
      this.markStateUnavailable();
      this.platform.log.error(
        'PAC indisponible après %d échecs de rafraîchissement consécutifs.',
        this.consecutiveRefreshFailures,
      );
      return;
    }

    this.platform.log.debug(
      'Échec de rafraîchissement de la PAC (%d/%d).',
      this.consecutiveRefreshFailures,
      UNAVAILABLE_AFTER_FAILURES,
    );
  }

  private markStateUnavailable(): void {
    const error = new Error('Communication avec la PAC indisponible.');

    this.service
      .updateCharacteristic(this.platform.Characteristic.Active, error)
      .updateCharacteristic(this.platform.Characteristic.CurrentTemperature, error)
      .updateCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature, error)
      .updateCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature, error)
      .updateCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, error)
      .updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState, error);
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

  private async setModeInBackground(mode: HvacMode, requestId: number): Promise<void> {
    this.pendingModeRequest = { mode, requestId };

    if (this.modeWorkerRunning) {
      return;
    }

    this.modeWorkerRunning = true;

    try {
      while (this.pendingModeRequest !== undefined) {
        const request = this.pendingModeRequest;

        this.pendingModeRequest = undefined;
        await this.processModeRequest(request.mode, request.requestId);
      }
    } finally {
      this.modeWorkerRunning = false;
    }
  }

  private async processModeRequest(mode: HvacMode, requestId: number): Promise<void> {
    try {
      const state = await this.controller.setMode(mode);
      const pendingRequest = this.pendingModeRequest;

      if (pendingRequest?.mode === state.mode) {
        this.pendingModeRequest = undefined;
        this.applyConfirmedModeState(state, pendingRequest.requestId);
      } else if (requestId === this.modeRequestId) {
        this.applyConfirmedModeState(state, requestId);
      } else {
        this.platform.log.debug('[mode #%d] Résultat obsolète ignoré.', requestId);
      }
    } catch (error) {
      this.platform.log.error(
        '[mode #%d] Impossible de modifier le mode de la PAC : %s',
        requestId,
        error instanceof Error ? error.message : String(error),
      );

      if (requestId !== this.modeRequestId || this.pendingModeRequest !== undefined) {
        this.platform.log.debug('[mode #%d] Resynchronisation obsolète ignorée.', requestId);
        return;
      }

      await this.restoreModeStateAfterFailure(requestId);
    }
  }

  private applyConfirmedModeState(state: HvacState, requestId: number): void {
    this.applyState(state);
    this.platform.log.info('[mode #%d] Commande → %s confirmée.', requestId, state.mode);
  }

  private async restoreModeStateAfterFailure(requestId: number): Promise<void> {
    try {
      const actualState = await this.controller.getState();

      if (requestId !== this.modeRequestId || this.pendingModeRequest !== undefined) {
        this.platform.log.debug('[mode #%d] État restauré obsolète ignoré.', requestId);
        return;
      }

      this.applyState(actualState);
      this.platform.log.info(
        '[mode #%d] État réel restauré après échec : mode=%s.',
        requestId,
        actualState.mode,
      );
    } catch (refreshError) {
      this.platform.log.error(
        '[mode #%d] Impossible de resynchroniser l’état après échec : %s',
        requestId,
        refreshError instanceof Error ? refreshError.message : String(refreshError),
      );
    }
  }

  private async setTargetTemperatureInBackground(value: number, requestId: number): Promise<void> {
    this.pendingTargetTemperatureRequest = { value, requestId };

    if (this.targetTemperatureWorkerRunning) {
      return;
    }

    this.targetTemperatureWorkerRunning = true;

    try {
      while (this.pendingTargetTemperatureRequest !== undefined) {
        const request = this.pendingTargetTemperatureRequest;

        this.pendingTargetTemperatureRequest = undefined;
        await this.processTargetTemperatureRequest(request.value, request.requestId);
      }
    } finally {
      this.targetTemperatureWorkerRunning = false;
    }
  }

  private async processTargetTemperatureRequest(value: number, requestId: number): Promise<void> {
    try {
      const state = await this.controller.setTargetTemperature(value);
      const pendingRequest = this.pendingTargetTemperatureRequest;

      if (pendingRequest?.value === state.targetTemperature) {
        this.pendingTargetTemperatureRequest = undefined;
        this.applyConfirmedTargetTemperatureState(state, pendingRequest.requestId);
      } else if (requestId === this.targetTemperatureRequestId) {
        this.applyConfirmedTargetTemperatureState(state, requestId);
      } else {
        this.platform.log.debug('[consigne #%d] Résultat obsolète ignoré.', requestId);
      }
    } catch (error) {
      this.platform.log.error(
        '[consigne #%d] Impossible de modifier la consigne de la PAC : %s',
        requestId,
        error instanceof Error ? error.message : String(error),
      );

      if (
        requestId !== this.targetTemperatureRequestId ||
        this.pendingTargetTemperatureRequest !== undefined
      ) {
        this.platform.log.debug('[consigne #%d] Resynchronisation obsolète ignorée.', requestId);
        return;
      }

      await this.restoreTargetTemperatureStateAfterFailure(requestId);
    }
  }

  private applyConfirmedTargetTemperatureState(state: HvacState, requestId: number): void {
    this.applyState(state);
    this.platform.log.info(
      '[consigne #%d] Commande → %s °C confirmée.',
      requestId,
      state.targetTemperature,
    );
  }

  private async restoreTargetTemperatureStateAfterFailure(requestId: number): Promise<void> {
    try {
      const actualState = await this.controller.getState();

      if (
        requestId !== this.targetTemperatureRequestId ||
        this.pendingTargetTemperatureRequest !== undefined
      ) {
        this.platform.log.debug('[consigne #%d] État restauré obsolète ignoré.', requestId);
        return;
      }

      this.applyState(actualState);
      this.platform.log.info(
        '[consigne #%d] État réel restauré après échec : consigne=%s °C.',
        requestId,
        actualState.targetTemperature,
      );
    } catch (refreshError) {
      this.platform.log.error(
        '[consigne #%d] Impossible de resynchroniser l’état après échec : %s',
        requestId,
        refreshError instanceof Error ? refreshError.message : String(refreshError),
      );
    }
  }

  private applyState(state: HvacState): void {
    const wasUnavailable = this.deviceUnavailable;

    this.consecutiveRefreshFailures = 0;
    this.deviceUnavailable = false;

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

    if (wasUnavailable) {
      this.platform.log.info('Communication avec la PAC rétablie.');
    }
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

  private fromTargetHeaterCoolerState(value: unknown): HvacMode {
    switch (value) {
      case this.platform.Characteristic.TargetHeaterCoolerState.AUTO:
        return HvacMode.Auto;

      case this.platform.Characteristic.TargetHeaterCoolerState.HEAT:
        return HvacMode.Heat;

      case this.platform.Characteristic.TargetHeaterCoolerState.COOL:
        return HvacMode.Cool;

      default:
        throw new Error(`État cible HomeKit non pris en charge : ${String(value)}.`);
    }
  }
}
