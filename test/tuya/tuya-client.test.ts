import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TuyaClient } from '../../src/tuya/tuya-client.js';

const { device } = vi.hoisted(() => ({
  device: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    find: vi.fn(),
    get: vi.fn(),
    on: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('tuyapi', () => ({
  default: class {
    public constructor() {
      return device;
    }
  },
}));

const DEVICE_ID = 'fake-device-id-that-must-remain-secret';
const LOCAL_KEY = 'fake-local-key-that-must-remain-secret';

function createClient(): TuyaClient {
  return new TuyaClient({
    deviceId: DEVICE_ID,
    localKey: LOCAL_KEY,
    ip: '192.0.2.1',
    protocolVersion: '3.5',
  });
}

function expectSafeError(error: unknown, expectedMessage: string): void {
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe(expectedMessage);
  expect((error as Error).message).not.toContain(DEVICE_ID);
  expect((error as Error).message).not.toContain(LOCAL_KEY);
}

describe('TuyaClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    device.find.mockResolvedValue(undefined);
    device.connect.mockResolvedValue(undefined);
    device.get.mockResolvedValue({ dps: {} });
    device.set.mockResolvedValue(undefined);
  });

  it('neutralise une erreur native de détection sans perdre sa cause', async () => {
    const nativeError = new Error(`find failed for ${DEVICE_ID} with ${LOCAL_KEY}`);
    device.find.mockRejectedValue(nativeError);

    const error = await createClient()
      .connect()
      .catch((caught: unknown) => caught);

    expectSafeError(error, 'Échec pendant la détection du périphérique Tuya.');
    expect((error as Error).cause).toBe(nativeError);
  });

  it('neutralise une erreur native de connexion', async () => {
    device.connect.mockRejectedValue(new Error(`connect failed for ${DEVICE_ID}`));

    const error = await createClient()
      .connect()
      .catch((caught: unknown) => caught);

    expectSafeError(error, 'Échec pendant la connexion au périphérique Tuya.');
  });

  it('neutralise une erreur native de lecture', async () => {
    device.get.mockRejectedValue(new Error(`get failed with ${LOCAL_KEY}`));
    const client = createClient();
    await client.connect();

    const error = await client.getStatus().catch((caught: unknown) => caught);

    expectSafeError(error, 'Échec pendant la lecture de l’état Tuya.');
  });

  it('neutralise une erreur native d’écriture', async () => {
    device.set.mockRejectedValue(new Error(`set failed for ${DEVICE_ID} with ${LOCAL_KEY}`));
    const client = createClient();
    await client.connect();

    const error = await client.setDp(1, true).catch((caught: unknown) => caught);

    expectSafeError(error, 'Échec pendant l’écriture Tuya.');
  });
});
