import type { PlatformAccessory } from 'homebridge';
import { describe, expect, it, vi } from 'vitest';

import type { HvacController } from '../../src/application/hvac-controller.js';
import { HvacMode } from '../../src/domain/hvac-mode.js';
import type { HvacState } from '../../src/domain/hvac-state.js';
import { HeaterCoolerAccessory } from '../../src/homekit/heater-cooler-accessory.js';
import type { TuyaHvacPlatform } from '../../src/platform.js';

function state(active: boolean): HvacState {
  return {
    active,
    currentTemperature: 28,
    targetTemperature: 30,
    mode: HvacMode.Auto,
  };
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: unknown) => void;
} {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (error: unknown) => void = () => undefined;

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

function createAccessoryHarness(): {
  readonly controller: {
    readonly getState: ReturnType<typeof vi.fn>;
    readonly setActive: ReturnType<typeof vi.fn>;
  };
  readonly triggerActive: (value: number) => void;
  readonly updateCharacteristic: ReturnType<typeof vi.fn>;
  readonly activeCharacteristic: { readonly ACTIVE: number; readonly INACTIVE: number };
} {
  const activeCharacteristic = { ACTIVE: 1, INACTIVE: 0 };
  const characteristics = {
    Active: activeCharacteristic,
    CoolingThresholdTemperature: Symbol('CoolingThresholdTemperature'),
    CurrentHeaterCoolerState: { IDLE: 1, INACTIVE: 0 },
    CurrentTemperature: Symbol('CurrentTemperature'),
    HeatingThresholdTemperature: Symbol('HeatingThresholdTemperature'),
    Manufacturer: Symbol('Manufacturer'),
    Model: Symbol('Model'),
    Name: Symbol('Name'),
    SerialNumber: Symbol('SerialNumber'),
    TargetHeaterCoolerState: { AUTO: 0, HEAT: 1, COOL: 2 },
  };
  const services = {
    AccessoryInformation: Symbol('AccessoryInformation'),
    HeaterCooler: Symbol('HeaterCooler'),
  };
  let activeHandler: ((value: number) => void) | undefined;
  const characteristic = {
    onSet: vi.fn((handler: (value: number) => void) => {
      activeHandler = handler;
      return characteristic;
    }),
    setProps: vi.fn(() => characteristic),
    updateValue: vi.fn(() => characteristic),
  };
  const service = {
    getCharacteristic: vi.fn(() => characteristic),
    setCharacteristic: vi.fn(() => service),
    updateCharacteristic: vi.fn(() => service),
  };
  const informationService = {
    setCharacteristic: vi.fn(() => informationService),
  };
  const accessory = {
    displayName: 'Piscine',
    getService: vi.fn((requestedService: unknown) =>
      requestedService === services.AccessoryInformation ? informationService : service,
    ),
  } as unknown as PlatformAccessory;
  const controller = {
    getState: vi.fn().mockResolvedValue(state(false)),
    setActive: vi.fn(),
  };
  const platform = {
    api: { hap: { Characteristic: characteristics } },
    Characteristic: characteristics,
    config: { deviceId: 'test-device' },
    log: {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
    Service: services,
  } as unknown as TuyaHvacPlatform;

  new HeaterCoolerAccessory(platform, accessory, controller as unknown as HvacController);

  return {
    controller,
    triggerActive: (value: number) => {
      if (activeHandler === undefined) {
        throw new Error('Handler Active non enregistré.');
      }

      activeHandler(value);
    },
    updateCharacteristic: service.updateCharacteristic,
    activeCharacteristic,
  };
}

describe('HeaterCoolerAccessory', () => {
  it('remplace les demandes intermédiaires et applique seulement la dernière intention', async () => {
    const harness = createAccessoryHarness();
    const firstCommand = deferred<HvacState>();

    await vi.waitFor(() => expect(harness.controller.getState).toHaveBeenCalledOnce());
    harness.controller.getState.mockClear();
    harness.updateCharacteristic.mockClear();
    harness.controller.setActive.mockReturnValueOnce(firstCommand.promise);

    harness.triggerActive(harness.activeCharacteristic.ACTIVE);
    harness.triggerActive(harness.activeCharacteristic.INACTIVE);
    harness.triggerActive(harness.activeCharacteristic.ACTIVE);

    expect(harness.controller.setActive).toHaveBeenCalledOnce();

    firstCommand.resolve(state(true));

    await vi.waitFor(() =>
      expect(harness.updateCharacteristic).toHaveBeenCalledWith(
        harness.activeCharacteristic,
        harness.activeCharacteristic.ACTIVE,
      ),
    );

    expect(harness.controller.setActive).toHaveBeenCalledOnce();
    expect(harness.updateCharacteristic).not.toHaveBeenCalledWith(
      harness.activeCharacteristic,
      harness.activeCharacteristic.INACTIVE,
    );
  });

  it('ne resynchronise pas un échec obsolète et exécute la dernière intention', async () => {
    const harness = createAccessoryHarness();
    const firstCommand = deferred<HvacState>();

    await vi.waitFor(() => expect(harness.controller.getState).toHaveBeenCalledOnce());
    harness.controller.getState.mockClear();
    harness.controller.setActive
      .mockReturnValueOnce(firstCommand.promise)
      .mockResolvedValueOnce(state(false));

    harness.triggerActive(harness.activeCharacteristic.ACTIVE);
    harness.triggerActive(harness.activeCharacteristic.INACTIVE);
    firstCommand.reject(new Error('Commande ON non confirmée'));

    await vi.waitFor(() => expect(harness.controller.setActive).toHaveBeenCalledTimes(2));

    expect(harness.controller.setActive).toHaveBeenNthCalledWith(1, true);
    expect(harness.controller.setActive).toHaveBeenNthCalledWith(2, false);
    expect(harness.controller.getState).not.toHaveBeenCalled();
  });
});
