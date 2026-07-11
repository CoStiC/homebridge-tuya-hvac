import type { HvacGateway } from '../domain/hvac-gateway.js';
import type { HvacState } from '../domain/hvac-state.js';
import { mapIvwInverter10DpsToState } from './ivw-inverter-10-profile.js';
import type { TuyaClient } from './tuya-client.js';

export class TuyaHvacGateway implements HvacGateway {
  public constructor(private readonly client: TuyaClient) {}

  public async getState(): Promise<HvacState> {
    await this.client.connect();

    try {
      const dps = await this.client.getStatus();

      return mapIvwInverter10DpsToState(dps);
    } finally {
      this.client.disconnect();
    }
  }
}
