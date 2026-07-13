import { setTimeout as delay } from 'node:timers/promises';

import type { HvacGateway } from '../domain/hvac-gateway.js';
import type { HvacMode } from '../domain/hvac-mode.js';
import type { HvacState } from '../domain/hvac-state.js';
import { IVW_INVERTER_10_PROFILE, mapIvwInverter10DpsToState } from './ivw-inverter-10-profile.js';
import type { TuyaClient, TuyaDps } from './tuya-client.js';

const CONFIRMATION_ATTEMPTS = 5;
const CONFIRMATION_DELAY_MS = 500;
const WRITE_ATTEMPTS = 2;

type Wait = (milliseconds: number) => Promise<void>;

interface WriteAttemptResult {
  readonly error?: unknown;
}

export class TuyaHvacGateway implements HvacGateway {
  private operationQueue: Promise<void> = Promise.resolve();

  public constructor(
    private readonly client: TuyaClient,
    private readonly wait: Wait = delay,
  ) {}

  public getState(): Promise<HvacState> {
    return this.runExclusive(() => this.readStateInNewConnection());
  }

  public setActive(active: boolean): Promise<HvacState> {
    return this.runExclusive(async () => {
      const currentState = await this.tryReadStateBeforeWrite();

      if (currentState?.active === active) {
        return currentState;
      }

      let lastWriteError: unknown;

      for (let writeAttempt = 1; writeAttempt <= WRITE_ATTEMPTS; writeAttempt += 1) {
        const writeResult = await this.tryWriteActive(active);

        lastWriteError = writeResult.error;

        const confirmation = await this.tryConfirmActive(active);

        if (confirmation.state !== undefined) {
          return confirmation.state;
        }

        if (writeAttempt < WRITE_ATTEMPTS) {
          await this.wait(CONFIRMATION_DELAY_MS);
        } else {
          throw this.createConfirmationError(
            active,
            confirmation.lastState,
            confirmation.lastReadError,
            lastWriteError,
          );
        }
      }

      throw new Error('État interne invalide pendant la commande ON/OFF.');
    });
  }

  public setMode(mode: HvacMode): Promise<HvacState> {
    return this.runExclusive(async () => {
      const currentState = await this.tryReadStateBeforeWrite();

      if (currentState?.mode === mode) {
        return currentState;
      }

      let lastWriteError: unknown;

      for (let writeAttempt = 1; writeAttempt <= WRITE_ATTEMPTS; writeAttempt += 1) {
        const writeResult = await this.tryWriteMode(mode);

        lastWriteError = writeResult.error;

        const confirmation = await this.tryConfirmMode(mode);

        if (confirmation.state !== undefined) {
          return confirmation.state;
        }

        if (writeAttempt < WRITE_ATTEMPTS) {
          await this.wait(CONFIRMATION_DELAY_MS);
        } else {
          throw this.createModeConfirmationError(
            mode,
            confirmation.lastState,
            confirmation.lastReadError,
            lastWriteError,
          );
        }
      }

      throw new Error('État interne invalide pendant la commande de mode.');
    });
  }

  public setTargetTemperature(value: number): Promise<HvacState> {
    return this.runExclusive(async () => {
      this.validateTargetTemperature(value);

      const currentState = await this.tryReadStateBeforeWrite();

      if (currentState?.targetTemperature === value) {
        return currentState;
      }

      let lastWriteError: unknown;

      for (let writeAttempt = 1; writeAttempt <= WRITE_ATTEMPTS; writeAttempt += 1) {
        const writeResult = await this.tryWriteTargetTemperature(value);

        lastWriteError = writeResult.error;

        const confirmation = await this.tryConfirmTargetTemperature(value);

        if (confirmation.state !== undefined) {
          return confirmation.state;
        }

        if (writeAttempt < WRITE_ATTEMPTS) {
          await this.wait(CONFIRMATION_DELAY_MS);
        } else {
          throw this.createTargetTemperatureConfirmationError(
            value,
            confirmation.lastState,
            confirmation.lastReadError,
            lastWriteError,
          );
        }
      }

      throw new Error('État interne invalide pendant la commande de consigne.');
    });
  }

  private async tryReadStateBeforeWrite(): Promise<HvacState | undefined> {
    try {
      return await this.readStateInNewConnection();
    } catch {
      /*
       * La prélecture est une optimisation.
       * Son échec ne doit pas empêcher l’envoi de la commande.
       */
      return undefined;
    }
  }

  private async tryWriteActive(active: boolean): Promise<WriteAttemptResult> {
    try {
      await this.client.connect();

      await this.client.setDp(Number(IVW_INVERTER_10_PROFILE.dps.active), active);

      return {};
    } catch (error) {
      /*
       * Un timeout d’écriture ne prouve pas que la commande n’a pas été
       * appliquée. La relecture du périphérique reste la source de vérité.
       */
      return { error };
    } finally {
      this.client.disconnect();
    }
  }

  private async tryWriteMode(mode: HvacMode): Promise<WriteAttemptResult> {
    try {
      await this.client.connect();
      await this.client.setDp(Number(IVW_INVERTER_10_PROFILE.dps.mode), mode);

      return {};
    } catch (error) {
      return { error };
    } finally {
      this.client.disconnect();
    }
  }

  private async tryWriteTargetTemperature(value: number): Promise<WriteAttemptResult> {
    try {
      await this.client.connect();
      await this.client.setDp(Number(IVW_INVERTER_10_PROFILE.dps.targetTemperature), value);

      return {};
    } catch (error) {
      return { error };
    } finally {
      this.client.disconnect();
    }
  }

  private async tryConfirmActive(expectedActive: boolean): Promise<{
    readonly state?: HvacState;
    readonly lastState?: HvacState;
    readonly lastReadError?: unknown;
  }> {
    let lastState: HvacState | undefined;
    let lastReadError: unknown;

    for (let attempt = 1; attempt <= CONFIRMATION_ATTEMPTS; attempt += 1) {
      if (attempt > 1) {
        await this.wait(CONFIRMATION_DELAY_MS);
      }

      try {
        const state = await this.readStateInNewConnection();

        lastState = state;
        lastReadError = undefined;

        if (state.active === expectedActive) {
          return { state };
        }
      } catch (error) {
        lastReadError = error;
      }
    }

    return {
      lastState,
      lastReadError,
    };
  }

  private async tryConfirmMode(expectedMode: HvacMode): Promise<{
    readonly state?: HvacState;
    readonly lastState?: HvacState;
    readonly lastReadError?: unknown;
  }> {
    let lastState: HvacState | undefined;
    let lastReadError: unknown;

    for (let attempt = 1; attempt <= CONFIRMATION_ATTEMPTS; attempt += 1) {
      if (attempt > 1) {
        await this.wait(CONFIRMATION_DELAY_MS);
      }

      try {
        const state = await this.readStateInNewConnection();

        lastState = state;
        lastReadError = undefined;

        if (state.mode === expectedMode) {
          return { state };
        }
      } catch (error) {
        lastReadError = error;
      }
    }

    return { lastState, lastReadError };
  }

  private async tryConfirmTargetTemperature(expectedValue: number): Promise<{
    readonly state?: HvacState;
    readonly lastState?: HvacState;
    readonly lastReadError?: unknown;
  }> {
    let lastState: HvacState | undefined;
    let lastReadError: unknown;

    for (let attempt = 1; attempt <= CONFIRMATION_ATTEMPTS; attempt += 1) {
      if (attempt > 1) {
        await this.wait(CONFIRMATION_DELAY_MS);
      }

      try {
        const state = await this.readStateInNewConnection();

        lastState = state;
        lastReadError = undefined;

        if (state.targetTemperature === expectedValue) {
          return { state };
        }
      } catch (error) {
        lastReadError = error;
      }
    }

    return { lastState, lastReadError };
  }

  private async readStateInNewConnection(): Promise<HvacState> {
    await this.client.connect();

    try {
      const dps = await this.client.getStatus();

      if (!this.hasCompleteStateDps(dps)) {
        throw new Error('Réponse Tuya partielle pendant la lecture de l’état.');
      }

      return mapIvwInverter10DpsToState(dps);
    } finally {
      this.client.disconnect();
    }
  }

  private hasCompleteStateDps(dps: TuyaDps): boolean {
    const requiredDps = [
      IVW_INVERTER_10_PROFILE.dps.active,
      IVW_INVERTER_10_PROFILE.dps.targetTemperature,
      IVW_INVERTER_10_PROFILE.dps.currentTemperature,
      IVW_INVERTER_10_PROFILE.dps.mode,
    ];

    return requiredDps.every((dp) => Object.prototype.hasOwnProperty.call(dps, dp));
  }

  private createConfirmationError(
    expectedActive: boolean,
    lastState: HvacState | undefined,
    lastReadError: unknown,
    lastWriteError: unknown,
  ): Error {
    const writeContext =
      lastWriteError === undefined
        ? ''
        : ` Dernière erreur d’écriture : ${this.formatError(lastWriteError)}.`;

    if (lastState !== undefined) {
      return new Error(
        `Commande ON/OFF non confirmée après ${WRITE_ATTEMPTS} écritures et ` +
          `${CONFIRMATION_ATTEMPTS} lectures par écriture : ` +
          `état attendu=${expectedActive}, état reçu=${lastState.active}.` +
          writeContext,
      );
    }

    return new Error(
      `Impossible de confirmer la commande ON/OFF après ` +
        `${WRITE_ATTEMPTS} écritures : ${this.formatError(lastReadError)}.` +
        writeContext,
    );
  }

  private createModeConfirmationError(
    expectedMode: HvacMode,
    lastState: HvacState | undefined,
    lastReadError: unknown,
    lastWriteError: unknown,
  ): Error {
    const writeContext =
      lastWriteError === undefined
        ? ''
        : ` Dernière erreur d’écriture : ${this.formatError(lastWriteError)}.`;

    if (lastState !== undefined) {
      return new Error(
        `Commande de mode non confirmée après ${WRITE_ATTEMPTS} écritures et ` +
          `${CONFIRMATION_ATTEMPTS} lectures par écriture : ` +
          `mode attendu=${expectedMode}, mode reçu=${lastState.mode}.` +
          writeContext,
      );
    }

    return new Error(
      `Impossible de confirmer la commande de mode après ` +
        `${WRITE_ATTEMPTS} écritures : ${this.formatError(lastReadError)}.` +
        writeContext,
    );
  }

  private createTargetTemperatureConfirmationError(
    expectedValue: number,
    lastState: HvacState | undefined,
    lastReadError: unknown,
    lastWriteError: unknown,
  ): Error {
    const writeContext =
      lastWriteError === undefined
        ? ''
        : ` Dernière erreur d’écriture : ${this.formatError(lastWriteError)}.`;

    if (lastState !== undefined) {
      return new Error(
        `Commande de consigne non confirmée après ${WRITE_ATTEMPTS} écritures et ` +
          `${CONFIRMATION_ATTEMPTS} lectures par écriture : ` +
          `température attendue=${expectedValue}, température reçue=${lastState.targetTemperature}.` +
          writeContext,
      );
    }

    return new Error(
      `Impossible de confirmer la commande de consigne après ` +
        `${WRITE_ATTEMPTS} écritures : ${this.formatError(lastReadError)}.` +
        writeContext,
    );
  }

  private validateTargetTemperature(value: number): void {
    const capabilities = IVW_INVERTER_10_PROFILE.targetTemperature;

    if (
      !Number.isFinite(value) ||
      value < capabilities.min ||
      value > capabilities.max ||
      (value - capabilities.min) % capabilities.step !== 0
    ) {
      throw new Error(
        `Consigne invalide : valeur entière attendue entre ` +
          `${capabilities.min} et ${capabilities.max} °C.`,
      );
    }
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previousOperation = this.operationQueue;

    let releaseQueue: () => void = () => undefined;

    this.operationQueue = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });

    await previousOperation;

    try {
      return await operation();
    } finally {
      releaseQueue();
    }
  }
}
