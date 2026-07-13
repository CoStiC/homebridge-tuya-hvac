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

    expect(client.connect).toHaveBeenCalledOnce();
    expect(client.disconnect).toHaveBeenCalledOnce();
  });

  it('ne transmet aucune écriture lorsque la PAC est déjà dans l’état demandé', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockResolvedValue({
        '1': true,
        '2': 30,
        '3': 31,
        '4': 'auto',
      }),
    } as unknown as TuyaClient;

    const gateway = new TuyaHvacGateway(client);

    await expect(gateway.setActive(true)).resolves.toEqual({
      active: true,
      targetTemperature: 30,
      currentTemperature: 31,
      mode: HvacMode.Auto,
    });

    expect(client.connect).toHaveBeenCalledOnce();
    expect(client.getStatus).toHaveBeenCalledOnce();
    expect(client.setDp).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledOnce();
  });

  it('écrit DP1 lorsque la prélecture indique un état différent', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockResolvedValue(undefined),
      getStatus: vi
        .fn()
        .mockResolvedValueOnce({ '1': false, '2': 30, '3': 31, '4': 'auto' })
        .mockResolvedValueOnce({ '1': true, '2': 30, '3': 31, '4': 'auto' }),
    } as unknown as TuyaClient;

    const wait = vi.fn().mockResolvedValue(undefined);
    const gateway = new TuyaHvacGateway(client, wait);

    await expect(gateway.setActive(true)).resolves.toEqual({
      active: true,
      targetTemperature: 30,
      currentTemperature: 31,
      mode: HvacMode.Auto,
    });

    expect(client.connect).toHaveBeenCalledTimes(3);
    expect(client.getStatus).toHaveBeenCalledTimes(2);
    expect(client.setDp).toHaveBeenCalledOnce();
    expect(client.setDp).toHaveBeenCalledWith(1, true);
    expect(client.disconnect).toHaveBeenCalledTimes(3);
    expect(wait).not.toHaveBeenCalled();
  });

  it('poursuit l’écriture lorsque la prélecture échoue', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockResolvedValue(undefined),
      getStatus: vi
        .fn()
        .mockRejectedValueOnce(new Error('Prélecture impossible'))
        .mockResolvedValueOnce({ '1': true, '2': 30, '3': 31, '4': 'auto' }),
    } as unknown as TuyaClient;

    const gateway = new TuyaHvacGateway(client);

    await expect(gateway.setActive(true)).resolves.toMatchObject({ active: true });
    expect(client.setDp).toHaveBeenCalledOnce();
    expect(client.setDp).toHaveBeenCalledWith(1, true);
    expect(client.getStatus).toHaveBeenCalledTimes(2);
  });

  it('accepte un timeout d’écriture lorsque la relecture confirme la commande', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockRejectedValue(new Error('Timeout écriture')),
      getStatus: vi
        .fn()
        .mockResolvedValueOnce({ '1': true, '2': 30, '3': 31, '4': 'auto' })
        .mockResolvedValueOnce({ '1': false, '2': 30, '3': 31, '4': 'auto' }),
    } as unknown as TuyaClient;

    const gateway = new TuyaHvacGateway(client);

    await expect(gateway.setActive(false)).resolves.toEqual({
      active: false,
      targetTemperature: 30,
      currentTemperature: 31,
      mode: HvacMode.Auto,
    });
    expect(client.setDp).toHaveBeenCalledOnce();
    expect(client.setDp).toHaveBeenCalledWith(1, false);
    expect(client.getStatus).toHaveBeenCalledTimes(2);
  });

  it('relit après un premier état de confirmation encore obsolète', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockResolvedValue(undefined),
      getStatus: vi
        .fn()
        .mockResolvedValueOnce({ '1': false, '2': 30, '3': 31, '4': 'auto' })
        .mockResolvedValueOnce({ '1': false, '2': 30, '3': 31, '4': 'auto' })
        .mockResolvedValueOnce({ '1': true, '2': 30, '3': 31, '4': 'auto' }),
    } as unknown as TuyaClient;
    const wait = vi.fn().mockResolvedValue(undefined);
    const gateway = new TuyaHvacGateway(client, wait);
    await expect(gateway.setActive(true)).resolves.toMatchObject({ active: true });
    expect(client.setDp).toHaveBeenCalledOnce();
    expect(client.getStatus).toHaveBeenCalledTimes(3);
    expect(client.connect).toHaveBeenCalledTimes(4);
    expect(client.disconnect).toHaveBeenCalledTimes(4);
    expect(wait).toHaveBeenCalledOnce();
  });

  it('relit après une première réponse de confirmation partielle', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockResolvedValue(undefined),
      getStatus: vi
        .fn()
        .mockResolvedValueOnce({ '1': false, '2': 30, '3': 31, '4': 'auto' })
        .mockResolvedValueOnce({ '1': true })
        .mockResolvedValueOnce({ '1': true, '2': 30, '3': 31, '4': 'auto' }),
    } as unknown as TuyaClient;
    const wait = vi.fn().mockResolvedValue(undefined);
    const gateway = new TuyaHvacGateway(client, wait);
    await expect(gateway.setActive(true)).resolves.toMatchObject({ active: true });
    expect(client.setDp).toHaveBeenCalledOnce();
    expect(client.getStatus).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledOnce();
  });

  it('effectue une seconde écriture lorsque la première n’est pas confirmée', async () => {
    const inactiveState = { '1': false, '2': 30, '3': 31, '4': 'auto' };
    const activeState = { '1': true, '2': 30, '3': 31, '4': 'auto' };
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockRejectedValue(new Error('Timeout écriture')),
      getStatus: vi
        .fn()
        .mockResolvedValueOnce(inactiveState)
        .mockResolvedValueOnce(inactiveState)
        .mockResolvedValueOnce(inactiveState)
        .mockResolvedValueOnce(inactiveState)
        .mockResolvedValueOnce(inactiveState)
        .mockResolvedValueOnce(inactiveState)
        .mockResolvedValueOnce(activeState),
    } as unknown as TuyaClient;
    const wait = vi.fn().mockResolvedValue(undefined);
    const gateway = new TuyaHvacGateway(client, wait);
    await expect(gateway.setActive(true)).resolves.toMatchObject({ active: true });
    expect(client.setDp).toHaveBeenCalledTimes(2);
    expect(client.setDp).toHaveBeenNthCalledWith(1, 1, true);
    expect(client.setDp).toHaveBeenNthCalledWith(2, 1, true);
    expect(client.getStatus).toHaveBeenCalledTimes(7);
    expect(wait).toHaveBeenCalledTimes(5);
  });

  it('rejette la commande après deux écritures non confirmées', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockRejectedValue(new Error('Timeout écriture')),
      getStatus: vi.fn().mockResolvedValue({ '1': false, '2': 30, '3': 31, '4': 'auto' }),
    } as unknown as TuyaClient;
    const wait = vi.fn().mockResolvedValue(undefined);
    const gateway = new TuyaHvacGateway(client, wait);
    await expect(gateway.setActive(true)).rejects.toThrow(
      'Commande ON/OFF non confirmée après 2 écritures et 5 lectures par écriture',
    );
    await expect(gateway.setActive(true)).rejects.toThrow(
      'Dernière erreur d’écriture : Timeout écriture',
    );
    expect(client.setDp).toHaveBeenCalledTimes(4);
  });

  it('rejette lorsque toutes les lectures de confirmation restent partielles', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockResolvedValue(undefined),
      getStatus: vi
        .fn()
        .mockResolvedValueOnce({ '1': false, '2': 30, '3': 31, '4': 'auto' })
        .mockResolvedValue({ '1': true }),
    } as unknown as TuyaClient;
    const wait = vi.fn().mockResolvedValue(undefined);
    const gateway = new TuyaHvacGateway(client, wait);
    await expect(gateway.setActive(true)).rejects.toThrow(
      'Impossible de confirmer la commande ON/OFF après 2 écritures',
    );
    expect(client.setDp).toHaveBeenCalledTimes(2);
    expect(client.getStatus).toHaveBeenCalledTimes(11);
    expect(wait).toHaveBeenCalledTimes(9);
  });

  it('ne transmet aucune écriture de mode lorsque DP4 est déjà dans le mode demandé', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockResolvedValue({ '1': false, '2': 30, '3': 31, '4': 'heat' }),
    } as unknown as TuyaClient;
    const gateway = new TuyaHvacGateway(client);

    await expect(gateway.setMode(HvacMode.Heat)).resolves.toMatchObject({ mode: HvacMode.Heat });

    expect(client.getStatus).toHaveBeenCalledOnce();
    expect(client.setDp).not.toHaveBeenCalled();
  });

  it.each([
    [HvacMode.Auto, HvacMode.Heat],
    [HvacMode.Heat, HvacMode.Auto],
    [HvacMode.Cool, HvacMode.Auto],
  ])(
    'écrit DP4=%s et retourne le mode confirmé dans un état complet',
    async (mode, initialMode) => {
      const client = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
        setDp: vi.fn().mockResolvedValue(undefined),
        getStatus: vi
          .fn()
          .mockResolvedValueOnce({ '1': false, '2': 30, '3': 31, '4': initialMode })
          .mockResolvedValueOnce({ '1': false, '2': 30, '3': 31, '4': mode }),
      } as unknown as TuyaClient;
      const gateway = new TuyaHvacGateway(client);

      await expect(gateway.setMode(mode)).resolves.toEqual({
        active: false,
        targetTemperature: 30,
        currentTemperature: 31,
        mode,
      });

      expect(client.setDp).toHaveBeenCalledOnce();
      expect(client.setDp).toHaveBeenCalledWith(4, mode);
      expect(client.getStatus).toHaveBeenCalledTimes(2);
      expect(client.connect).toHaveBeenCalledTimes(3);
      expect(client.disconnect).toHaveBeenCalledTimes(3);
    },
  );

  it('rejette un mode non confirmé après deux écritures', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockRejectedValue(new Error('Timeout écriture')),
      getStatus: vi.fn().mockResolvedValue({ '1': false, '2': 30, '3': 31, '4': 'auto' }),
    } as unknown as TuyaClient;
    const wait = vi.fn().mockResolvedValue(undefined);
    const gateway = new TuyaHvacGateway(client, wait);

    await expect(gateway.setMode(HvacMode.Heat)).rejects.toThrow(
      'Commande de mode non confirmée après 2 écritures et 5 lectures par écriture',
    );

    expect(client.setDp).toHaveBeenCalledTimes(2);
    expect(client.setDp).toHaveBeenCalledWith(4, HvacMode.Heat);
    expect(client.getStatus).toHaveBeenCalledTimes(11);
    expect(wait).toHaveBeenCalledTimes(9);
  });

  it('ne transmet aucune écriture de consigne lorsque DP2 est déjà à la valeur demandée', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockResolvedValue({ '1': false, '2': 30, '3': 31, '4': 'auto' }),
    } as unknown as TuyaClient;
    const gateway = new TuyaHvacGateway(client);

    await expect(gateway.setTargetTemperature(30)).resolves.toMatchObject({
      targetTemperature: 30,
    });

    expect(client.getStatus).toHaveBeenCalledOnce();
    expect(client.setDp).not.toHaveBeenCalled();
  });

  it('écrit DP2 et retourne la consigne confirmée dans un état complet', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockResolvedValue(undefined),
      getStatus: vi
        .fn()
        .mockResolvedValueOnce({ '1': false, '2': 30, '3': 31, '4': 'auto' })
        .mockResolvedValueOnce({ '1': false, '2': 29, '3': 31, '4': 'auto' }),
    } as unknown as TuyaClient;
    const gateway = new TuyaHvacGateway(client);

    await expect(gateway.setTargetTemperature(29)).resolves.toEqual({
      active: false,
      targetTemperature: 29,
      currentTemperature: 31,
      mode: HvacMode.Auto,
    });

    expect(client.setDp).toHaveBeenCalledOnce();
    expect(client.setDp).toHaveBeenCalledWith(2, 29);
    expect(client.getStatus).toHaveBeenCalledTimes(2);
    expect(client.connect).toHaveBeenCalledTimes(3);
    expect(client.disconnect).toHaveBeenCalledTimes(3);
  });

  it('relit la consigne après une première réponse de confirmation partielle', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockResolvedValue(undefined),
      getStatus: vi
        .fn()
        .mockResolvedValueOnce({ '1': false, '2': 30, '3': 31, '4': 'auto' })
        .mockResolvedValueOnce({ '2': 29 })
        .mockResolvedValueOnce({ '1': false, '2': 29, '3': 31, '4': 'auto' }),
    } as unknown as TuyaClient;
    const wait = vi.fn().mockResolvedValue(undefined);
    const gateway = new TuyaHvacGateway(client, wait);

    await expect(gateway.setTargetTemperature(29)).resolves.toMatchObject({
      targetTemperature: 29,
    });

    expect(client.setDp).toHaveBeenCalledOnce();
    expect(client.getStatus).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledOnce();
  });

  it('rejette une consigne non confirmée après deux écritures', async () => {
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      setDp: vi.fn().mockRejectedValue(new Error('Timeout écriture')),
      getStatus: vi.fn().mockResolvedValue({ '1': false, '2': 30, '3': 31, '4': 'auto' }),
    } as unknown as TuyaClient;
    const wait = vi.fn().mockResolvedValue(undefined);
    const gateway = new TuyaHvacGateway(client, wait);

    await expect(gateway.setTargetTemperature(29)).rejects.toThrow(
      'Commande de consigne non confirmée après 2 écritures et 5 lectures par écriture',
    );

    expect(client.setDp).toHaveBeenCalledTimes(2);
    expect(client.setDp).toHaveBeenCalledWith(2, 29);
    expect(client.getStatus).toHaveBeenCalledTimes(11);
    expect(wait).toHaveBeenCalledTimes(9);
  });

  it.each([7, 33, 29.5])(
    'rejette la consigne hors capacités %s sans accès au client',
    async (value) => {
      const client = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        setDp: vi.fn(),
        getStatus: vi.fn(),
      } as unknown as TuyaClient;
      const gateway = new TuyaHvacGateway(client);

      await expect(gateway.setTargetTemperature(value)).rejects.toThrow(
        'Consigne invalide : valeur entière attendue entre 8 et 32 °C.',
      );

      expect(client.connect).not.toHaveBeenCalled();
      expect(client.setDp).not.toHaveBeenCalled();
    },
  );

  it('sérialise deux transactions concurrentes', async () => {
    let releaseFirstRead: (() => void) | undefined;
    const firstRead = new Promise<Record<string, unknown>>((resolve) => {
      releaseFirstRead = () => resolve({ '1': false, '2': 30, '3': 31, '4': 'auto' });
    });
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      getStatus: vi
        .fn()
        .mockImplementationOnce(() => firstRead)
        .mockResolvedValueOnce({ '1': true, '2': 30, '3': 31, '4': 'auto' }),
    } as unknown as TuyaClient;
    const gateway = new TuyaHvacGateway(client);
    const firstOperation = gateway.getState();
    await vi.waitFor(() => expect(client.getStatus).toHaveBeenCalledTimes(1));
    const secondOperation = gateway.getState();
    await Promise.resolve();
    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.getStatus).toHaveBeenCalledTimes(1);
    releaseFirstRead?.();
    await expect(firstOperation).resolves.toMatchObject({ active: false });
    await expect(secondOperation).resolves.toMatchObject({ active: true });
    expect(client.connect).toHaveBeenCalledTimes(2);
    expect(client.getStatus).toHaveBeenCalledTimes(2);
    expect(client.disconnect).toHaveBeenCalledTimes(2);
  });
});
