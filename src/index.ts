import type { API } from 'homebridge';

import { TuyaHvacPlatform } from './platform.js';
import { PLATFORM_NAME } from './settings.js';

export default function registerPlatform(api: API): void {
  api.registerPlatform(PLATFORM_NAME, TuyaHvacPlatform);
}
