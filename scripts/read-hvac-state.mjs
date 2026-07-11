import { readFile } from 'node:fs/promises';

import { TuyaClient } from '../dist/tuya/tuya-client.js';
import { TuyaHvacGateway } from '../dist/tuya/tuya-hvac-gateway.js';

const configFile = new URL('../homebridge-dev/config.json', import.meta.url);
const config = JSON.parse(await readFile(configFile, 'utf8'));

const platformConfig = config.platforms?.find((platform) => platform.platform === 'TuyaHvac');

if (!platformConfig) {
  throw new Error('Configuration TuyaHvac absente de homebridge-dev/config.json.');
}

const client = new TuyaClient({
  deviceId: platformConfig.deviceId,
  localKey: platformConfig.localKey,
  ip: platformConfig.ip,
  protocolVersion: platformConfig.protocolVersion,
});

const gateway = new TuyaHvacGateway(client);
const state = await gateway.getState();

console.log('État HVAC réel :');
console.dir(state, { depth: null });
