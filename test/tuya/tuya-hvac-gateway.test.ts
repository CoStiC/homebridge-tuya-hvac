import { describe, expect, it, vi } from 'vitest';

import { HvacMode } from '../../src/domain/hvac-mode.js';
import { TuyaHvacGateway } from '../../src/tuya/tuya-hvac-gateway.js';
import type { TuyaClient } from '../../src/tuya/tuya-client.js';

describe('TuyaHvacGateway', () => {
  it('retourne un HvacState à partir des DP lus par le client', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      getStatus: vi.fn().mockResolvedValue({
        '1': true,
        '2': 30,
        '3': 27,
        '4': 'heat',
        '13': 0,
      }),
    } as unknown as TuyaClient;

    const gateway = new TuyaHvacGateway(client);

    await expect(gateway.getState()).resolves.toEqual({
      active: true,
      targetTemperature: 30,
      currentTemperature: 27,
      mode: HvacMode.Heat,
    });

    expect(client.connect).toHaveBeenCalledOnce();
    expect(client.getStatus).toHaveBeenCalledOnce();
    expect(client.disconnect).toHaveBeenCalledOnce();
  });

  it('déconnecte le client lorsque la lecture échoue', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      getStatus: vi.fn().mockRejectedValue(new Error('Lecture impossible')),
    } as unknown as TuyaClient;

    const gateway = new TuyaHvacGateway(client);

    await expect(gateway.getState()).rejects.toThrow('Lecture impossible');
    expect(client.disconnect).toHaveBeenCalledOnce();
  });
});
