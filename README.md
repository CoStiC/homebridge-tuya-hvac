# Homebridge Tuya HVAC

Homebridge plugin for controlling compatible Tuya HVAC devices locally over the LAN, without a Tuya Cloud dependency at runtime.

The current device profile supports the IVW Inverter 10 swimming-pool heat pump using Tuya LAN protocol 3.5.

## Requirements

- Node.js 22.10 or later in the Node.js 22 line, or Node.js 24;
- Homebridge 1.8 or 2.x;
- a supported Tuya device reachable from the Homebridge host over the LAN;
- the device ID, Local Key and fixed or reserved IP address obtained during setup.

## Beta installation

After the first beta is published, install it explicitly through the `beta` dist-tag:

```bash
npm install homebridge-tuya-hvac@beta
```

The unqualified command `npm install homebridge-tuya-hvac` will not select the beta while no `latest` dist-tag has been assigned.

## Local package installation

Create the package from a clean checkout:

```bash
npm ci
npm test
npm pack
```

Install the resulting tarball in the Homebridge environment:

```bash
npm install /path/to/homebridge-tuya-hvac-0.1.0.tgz
```

Keep local tarballs private because they represent development builds.

## Configuration

Configure the plugin through the Homebridge UI when available, or add the platform configuration without committing it to source control:

```json
{
  "platform": "TuyaHvac",
  "name": "Pool",
  "deviceId": "YOUR_DEVICE_ID",
  "ip": "192.0.2.10",
  "localKey": "YOUR_LOCAL_KEY",
  "protocolVersion": "3.5",
  "refreshIntervalSeconds": 30
}
```

`refreshIntervalSeconds` is optional. It defaults to 30 seconds and accepts integer values from 5 to 3600 seconds.

Never publish the device ID, Local Key, HomeKit PIN or a real configuration file.

## Supported behavior

- independent ON/OFF control;
- Auto, Heat and Cool modes;
- target temperature from 8 °C to 32 °C in 1 °C steps;
- confirmed writes followed by explicit device reads;
- periodic state synchronization and HomeKit availability reporting;
- LAN-only runtime operation.

Boost and Silent/Eco Tuya modes are recognized when reading device state but are not exposed as selectable HomeKit target modes.

## Documentation

Technical architecture, protocol notes, testing guidance and the changelog are available in [`docs/`](docs/README.md).

## Development

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md). All changes must pass:

```bash
npm run format
npm run typecheck
npm run lint
npm test
npm run build
```

Real-device validation is required for protocol-facing changes. Unit tests alone do not prove physical device behavior.

## Project status

Version 0.1.0 is the first public beta. The API and supported behavior may still evolve before a stable release.

## License

This project is licensed under the [MIT License](LICENSE).
