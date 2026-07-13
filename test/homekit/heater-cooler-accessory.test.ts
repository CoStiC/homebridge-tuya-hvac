import type { PlatformAccessory } from 'homebridge';
import { describe, expect, it, vi } from 'vitest';

import type { HvacController } from '../../src/application/hvac-controller.js';
import { HvacMode } from '../../src/domain/hvac-mode.js';
import type { HvacState } from '../../src/domain/hvac-state.js';
import { HeaterCoolerAccessory } from '../../src/homekit/heater-cooler-accessory.js';
import type { TuyaHvacPlatform } from '../../src/platform.js';

function state(active: boolean, mode: HvacMode = HvacMode.Auto, targetTemperature = 30): HvacState {
  return {
    active,
    currentTemperature: 28,
    targetTemperature,
    mode,
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
    readonly setMode: ReturnType<typeof vi.fn>;
    readonly setTargetTemperature: ReturnType<typeof vi.fn>;
  };
  readonly triggerActive: (value: number) => void;
  readonly triggerMode: (value: number) => void;
  readonly triggerHeatingThreshold: (value: number) => void;
  readonly triggerCoolingThreshold: (value: number) => void;
  readonly triggerRefresh: () => void;
  readonly shutdown: () => void;
  readonly scheduleInterval: ReturnType<typeof vi.fn>;
  readonly cancelInterval: ReturnType<typeof vi.fn>;
  readonly logError: ReturnType<typeof vi.fn>;
  readonly updateCharacteristic: ReturnType<typeof vi.fn>;
  readonly activeCharacteristic: { readonly ACTIVE: number; readonly INACTIVE: number };
  readonly targetCharacteristic: {
    readonly AUTO: number;
    readonly HEAT: number;
    readonly COOL: number;
  };
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
  let modeHandler: ((value: number) => void) | undefined;
  let heatingThresholdHandler: ((value: number) => void) | undefined;
  let coolingThresholdHandler: ((value: number) => void) | undefined;
  let refreshHandler: (() => void) | undefined;
  const activeHandlerCharacteristic = {
    onSet: vi.fn((handler: (value: number) => void) => {
      activeHandler = handler;
      return activeHandlerCharacteristic;
    }),
  };
  const modeHandlerCharacteristic = {
    onSet: vi.fn((handler: (value: number) => void) => {
      modeHandler = handler;
      return modeHandlerCharacteristic;
    }),
  };
  const createThresholdCharacteristic = (
    setHandler: (handler: (value: number) => void) => void,
  ) => {
    const characteristic = {
      onSet: vi.fn((handler: (value: number) => void) => {
        setHandler(handler);
        return characteristic;
      }),
      setProps: vi.fn(() => characteristic),
      updateValue: vi.fn(() => characteristic),
    };

    return characteristic;
  };
  const heatingThresholdCharacteristic = createThresholdCharacteristic((handler) => {
    heatingThresholdHandler = handler;
  });
  const coolingThresholdCharacteristic = createThresholdCharacteristic((handler) => {
    coolingThresholdHandler = handler;
  });
  const readOnlyCharacteristic = {
    setProps: vi.fn(() => readOnlyCharacteristic),
    updateValue: vi.fn(() => readOnlyCharacteristic),
  };
  const service = {
    getCharacteristic: vi.fn((requestedCharacteristic: unknown) => {
      if (requestedCharacteristic === characteristics.Active) {
        return activeHandlerCharacteristic;
      }

      if (requestedCharacteristic === characteristics.TargetHeaterCoolerState) {
        return modeHandlerCharacteristic;
      }

      if (requestedCharacteristic === characteristics.HeatingThresholdTemperature) {
        return heatingThresholdCharacteristic;
      }

      if (requestedCharacteristic === characteristics.CoolingThresholdTemperature) {
        return coolingThresholdCharacteristic;
      }

      return readOnlyCharacteristic;
    }),
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
    setMode: vi.fn(),
    setTargetTemperature: vi.fn(),
  };
  const platform = {
    api: { hap: { Characteristic: characteristics } },
    Characteristic: characteristics,
    config: { deviceId: 'test-device', refreshIntervalSeconds: 30 },
    log: {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
    Service: services,
  } as unknown as TuyaHvacPlatform;

  const refreshTimer = {} as ReturnType<typeof setInterval>;
  const scheduleInterval = vi.fn((handler: () => void) => {
    refreshHandler = handler;
    return refreshTimer;
  });
  const cancelInterval = vi.fn();
  const heaterCoolerAccessory = new HeaterCoolerAccessory(
    platform,
    accessory,
    controller as unknown as HvacController,
    scheduleInterval as unknown as typeof setInterval,
    cancelInterval as unknown as typeof clearInterval,
  );

  return {
    controller,
    triggerActive: (value: number) => {
      if (activeHandler === undefined) {
        throw new Error('Handler Active non enregistré.');
      }

      activeHandler(value);
    },
    triggerMode: (value: number) => {
      if (modeHandler === undefined) {
        throw new Error('Handler TargetHeaterCoolerState non enregistré.');
      }

      modeHandler(value);
    },
    triggerHeatingThreshold: (value: number) => {
      if (heatingThresholdHandler === undefined) {
        throw new Error('Handler HeatingThresholdTemperature non enregistré.');
      }

      heatingThresholdHandler(value);
    },
    triggerCoolingThreshold: (value: number) => {
      if (coolingThresholdHandler === undefined) {
        throw new Error('Handler CoolingThresholdTemperature non enregistré.');
      }

      coolingThresholdHandler(value);
    },
    triggerRefresh: () => {
      if (refreshHandler === undefined) {
        throw new Error('Rafraîchissement périodique non enregistré.');
      }

      refreshHandler();
    },
    shutdown: () => heaterCoolerAccessory.shutdown(),
    scheduleInterval,
    cancelInterval,
    logError: platform.log.error as ReturnType<typeof vi.fn>,
    updateCharacteristic: service.updateCharacteristic,
    activeCharacteristic,
    targetCharacteristic: characteristics.TargetHeaterCoolerState,
  };
}

describe('HeaterCoolerAccessory', () => {
  it('programme le rafraîchissement avec l’intervalle configuré', () => {
    const harness = createAccessoryHarness();

    expect(harness.scheduleInterval).toHaveBeenCalledOnce();
    expect(harness.scheduleInterval).toHaveBeenCalledWith(expect.any(Function), 30_000);
  });

  it('ne chevauche pas deux rafraîchissements', async () => {
    const harness = createAccessoryHarness();
    const periodicRead = deferred<HvacState>();

    await vi.waitFor(() => expect(harness.controller.getState).toHaveBeenCalledOnce());
    harness.controller.getState.mockReset().mockReturnValue(periodicRead.promise);
    harness.triggerRefresh();
    harness.triggerRefresh();

    expect(harness.controller.getState).toHaveBeenCalledOnce();

    periodicRead.resolve(state(false));
    await periodicRead.promise;
    await Promise.resolve();

    harness.controller.getState.mockResolvedValue(state(true));
    harness.triggerRefresh();

    await vi.waitFor(() => expect(harness.controller.getState).toHaveBeenCalledTimes(2));
  });

  it('annule le rafraîchissement périodique à l’arrêt', async () => {
    const harness = createAccessoryHarness();

    await vi.waitFor(() => expect(harness.controller.getState).toHaveBeenCalledOnce());
    harness.controller.getState.mockClear();
    harness.shutdown();
    harness.triggerRefresh();

    expect(harness.cancelInterval).toHaveBeenCalledOnce();
    expect(harness.controller.getState).not.toHaveBeenCalled();
  });

  it('distingue une erreur de rafraîchissement d’une erreur de lecture initiale', async () => {
    const harness = createAccessoryHarness();

    await vi.waitFor(() => expect(harness.controller.getState).toHaveBeenCalledOnce());
    harness.controller.getState.mockRejectedValue(new Error('Lecture impossible'));
    harness.triggerRefresh();

    await vi.waitFor(() =>
      expect(harness.logError).toHaveBeenCalledWith(
        'Impossible de rafraîchir l’état de la PAC : %s',
        'Lecture impossible',
      ),
    );
  });

  it.each([
    [0, HvacMode.Auto],
    [1, HvacMode.Heat],
    [2, HvacMode.Cool],
  ])('traduit le mode HomeKit %s en %s', async (homeKitMode, domainMode) => {
    const harness = createAccessoryHarness();

    await vi.waitFor(() => expect(harness.controller.getState).toHaveBeenCalledOnce());
    harness.controller.setMode.mockResolvedValue(state(false, domainMode));

    harness.triggerMode(homeKitMode);

    await vi.waitFor(() => expect(harness.controller.setMode).toHaveBeenCalledWith(domainMode));
  });

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

  it('traduit et coalesce les demandes HomeKit de mode', async () => {
    const harness = createAccessoryHarness();
    const firstCommand = deferred<HvacState>();

    await vi.waitFor(() => expect(harness.controller.getState).toHaveBeenCalledOnce());
    harness.updateCharacteristic.mockClear();
    harness.controller.setMode
      .mockReturnValueOnce(firstCommand.promise)
      .mockResolvedValueOnce(state(false, HvacMode.Cool));

    harness.triggerMode(harness.targetCharacteristic.HEAT);
    harness.triggerMode(harness.targetCharacteristic.AUTO);
    harness.triggerMode(harness.targetCharacteristic.COOL);

    expect(harness.controller.setMode).toHaveBeenCalledOnce();
    expect(harness.controller.setMode).toHaveBeenCalledWith(HvacMode.Heat);

    firstCommand.resolve(state(false, HvacMode.Heat));

    await vi.waitFor(() => expect(harness.controller.setMode).toHaveBeenCalledTimes(2));
    await vi.waitFor(() =>
      expect(harness.updateCharacteristic).toHaveBeenCalledWith(
        harness.targetCharacteristic,
        harness.targetCharacteristic.COOL,
      ),
    );

    expect(harness.controller.setMode).toHaveBeenNthCalledWith(2, HvacMode.Cool);
    expect(harness.controller.setMode).not.toHaveBeenCalledWith(HvacMode.Auto);
  });

  it.each(['heating', 'cooling'] as const)(
    'traduit le seuil %s en commande de consigne unique',
    async (threshold) => {
      const harness = createAccessoryHarness();

      await vi.waitFor(() => expect(harness.controller.getState).toHaveBeenCalledOnce());
      harness.controller.setTargetTemperature.mockResolvedValue(state(false, HvacMode.Auto, 29));

      if (threshold === 'heating') {
        harness.triggerHeatingThreshold(29);
      } else {
        harness.triggerCoolingThreshold(29);
      }

      await vi.waitFor(() =>
        expect(harness.controller.setTargetTemperature).toHaveBeenCalledWith(29),
      );
    },
  );

  it('coalesce les demandes rapides de consigne et applique seulement la dernière', async () => {
    const harness = createAccessoryHarness();
    const firstCommand = deferred<HvacState>();

    await vi.waitFor(() => expect(harness.controller.getState).toHaveBeenCalledOnce());
    harness.updateCharacteristic.mockClear();
    harness.controller.setTargetTemperature
      .mockReturnValueOnce(firstCommand.promise)
      .mockResolvedValueOnce(state(false, HvacMode.Auto, 27));

    harness.triggerHeatingThreshold(29);
    harness.triggerCoolingThreshold(28);
    harness.triggerHeatingThreshold(27);

    expect(harness.controller.setTargetTemperature).toHaveBeenCalledOnce();
    expect(harness.controller.setTargetTemperature).toHaveBeenCalledWith(29);

    firstCommand.resolve(state(false, HvacMode.Auto, 29));

    await vi.waitFor(() =>
      expect(harness.controller.setTargetTemperature).toHaveBeenCalledTimes(2),
    );
    await vi.waitFor(() =>
      expect(harness.updateCharacteristic).toHaveBeenCalledWith(expect.anything(), 27),
    );

    expect(harness.controller.setTargetTemperature).toHaveBeenNthCalledWith(2, 27);
    expect(harness.controller.setTargetTemperature).not.toHaveBeenCalledWith(28);
  });
});
