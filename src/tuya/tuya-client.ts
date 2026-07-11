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
  }

  public async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    await this.device.find();
    await this.device.connect();

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

    const response = (await this.device.get({
      schema: true,
    })) as TuyaStatusResponse;

    if (response.dps === null || typeof response.dps !== 'object' || Array.isArray(response.dps)) {
      throw new Error('Réponse Tuya invalide : objet "dps" attendu.');
    }

    return response.dps as TuyaDps;
  }

  public async setDp(dp: number, value: TuyaDpValue): Promise<void> {
    this.assertConnected();

    await this.device.set({
      dps: dp,
      set: value,
    });
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new Error('Le client Tuya n’est pas connecté.');
    }
  }
}
