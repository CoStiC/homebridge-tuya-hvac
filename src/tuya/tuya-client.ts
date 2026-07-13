import { clearTimeout, setTimeout } from 'node:timers';

import TuyAPI from 'tuyapi';

export type TuyaDps = Record<string, unknown>;
export type TuyaDpValue = string | number | boolean;

export interface TuyaClientOptions {
  readonly deviceId: string;
  readonly localKey: string;
  readonly ip: string;
  readonly protocolVersion: '3.5';
}

interface TuyaStatusResponse {
  readonly dps?: unknown;
}

const TUYA_OPERATION_TIMEOUT_MS = 8_000;

export class TuyaClient {
  private readonly device: TuyAPI;
  private connected = false;

  public constructor(options: TuyaClientOptions) {
    this.device = new TuyAPI({
      id: options.deviceId,
      key: options.localKey,
      ip: options.ip,
      version: options.protocolVersion,
      issueGetOnConnect: false,
    });

    this.device.on('disconnected', () => {
      this.connected = false;
    });

    /*
     * TuyAPI émet parfois un événement "error" en plus de rejeter
     * la promesse de l’opération. Sans listener, EventEmitter transforme
     * cet événement en erreur non gérée.
     *
     * L’erreur exploitable reste propagée par connect(), get() ou set().
     */
    this.device.on('error', () => undefined);
  }

  public async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    await this.withTimeout(
      this.device.find(),
      'Délai dépassé pendant la détection du périphérique Tuya.',
    );

    await this.withTimeout(
      this.device.connect(),
      'Délai dépassé pendant la connexion au périphérique Tuya.',
    );

    this.connected = true;
  }

  public disconnect(): void {
    if (!this.connected) {
      return;
    }

    this.device.disconnect();
    this.connected = false;
  }

  public async getStatus(): Promise<TuyaDps> {
    this.assertConnected();

    const response = (await this.withTimeout(
      this.device.get({
        schema: true,
      }),
      'Délai dépassé pendant la lecture de l’état Tuya.',
    )) as TuyaStatusResponse;

    if (response.dps === null || typeof response.dps !== 'object' || Array.isArray(response.dps)) {
      throw new Error('Réponse Tuya invalide : objet "dps" attendu.');
    }

    return response.dps as TuyaDps;
  }

  public async setDp(dp: number, value: TuyaDpValue): Promise<void> {
    this.assertConnected();

    /*
     * On conserve le comportement par défaut de TuyAPI :
     * shouldWaitForResponse=true.
     *
     * La socket reste ainsi ouverte jusqu’à la réponse ou au timeout
     * interne de TuyAPI. Le gateway relira ensuite l’état réel pour
     * déterminer si l’écriture a été appliquée.
     */
    await this.withTimeout(
      this.device.set({
        dps: dp,
        set: value,
      }),
      'Délai dépassé pendant l’écriture Tuya.',
    );
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new Error('Le client Tuya n’est pas connecté.');
    }
  }

  private async withTimeout<T>(operation: Promise<T>, errorMessage: string): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(errorMessage));
      }, TUYA_OPERATION_TIMEOUT_MS);
    });

    try {
      return await Promise.race([operation, timeoutPromise]);
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    }
  }
}
