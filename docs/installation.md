# Installation

This guide describes the setup validated for the IVW Inverter 10 heat pump. The
plugin runs entirely over the local network after setup, but retrieving the Tuya
credentials requires temporary access to the Tuya Cloud.

## Prerequisites

- Node.js 22.10 or later in the Node.js 22 line, or Node.js 24;
- Homebridge 1.8 or 2.x with the Homebridge UI;
- the heat pump paired with a non-guest Smart Life account;
- the Homebridge host and heat pump connected to the same LAN;
- permission to reserve a fixed IP address for the heat pump in the router.

The plugin needs four device-specific values:

| Setting           | Source                                       |
| ----------------- | -------------------------------------------- |
| `deviceId`        | TinyTuya scan or wizard                      |
| `ip`              | TinyTuya scan or the router's device list    |
| `localKey`        | TinyTuya wizard through a Tuya Cloud project |
| `protocolVersion` | `3.5` for the validated IVW Inverter 10      |

The Device ID and Local Key are secrets. Never paste them into an issue, log,
screenshot or committed configuration file.

## Pair the heat pump

Pair the heat pump with the Smart Life application before retrieving its LAN
credentials. Use the account that will later be linked to the Tuya developer
project; do not use a guest account.

Reserve the heat pump's IP address in the router after pairing. A DHCP
reservation is preferable to configuring a static address directly on the
device.

## Create the temporary Tuya Cloud project

The validated credential-retrieval method uses the
[TinyTuya setup wizard](https://github.com/jasonacox/tinytuya#setup-wizard---getting-local-keys):

1. Create or sign in to a developer account at
   [Tuya IoT Platform](https://iot.tuya.com/).
2. Create a Cloud project in the data center corresponding to the Smart Life
   account's region.
3. Record the project's Access ID/Client ID and Access Secret/Client Secret in a
   password manager. These are Cloud credentials, not the device's Local Key.
4. Authorize the project for the `IoT Core` and `Authorization` services.
5. In the project's device section, link the Smart Life account and approve the
   association from the mobile application.
6. Confirm that the heat pump appears in the project's device list.

Tuya changes its portal periodically. Follow the current TinyTuya wizard
documentation if a label or screen differs from this summary.

## Retrieve the Device ID and Local Key

Run TinyTuya outside this repository and outside the Homebridge storage
directory. The wizard writes files containing credentials, so use a private
temporary directory and do not commit or share its contents.

Example on a Linux or macOS workstation:

```bash
mkdir tinytuya-setup
cd tinytuya-setup
python3 -m venv .venv
. .venv/bin/activate
python -m pip install tinytuya
python -m tinytuya wizard
```

The wizard asks for:

- the Tuya project Access ID;
- the Tuya project Access Secret;
- the Cloud region;
- a sample Device ID, or permission to scan the LAN.

Select the heat pump by its Smart Life name and record only its:

- `id`, used as `deviceId` in Homebridge;
- `key`, used as `localKey` in Homebridge;
- detected IP address;
- detected protocol version.

Do not confuse the Device ID with the Tuya product ID or Cloud project client
ID. For the validated IVW Inverter 10, configure protocol version `3.5` even if
an older version is suggested elsewhere.

TinyTuya may create `tinytuya.json`, `devices.json`, `tuya-raw.json` and
`snapshot.json`. Treat all of them as sensitive because they may contain Cloud
credentials, Device IDs or Local Keys. Store them in an encrypted location if
they must be retained; otherwise remove the temporary setup directory after
Homebridge has been configured and tested.

Removing and re-adding the heat pump in Smart Life can change its Local Key. If
LAN authentication later fails after re-pairing, run the wizard again and
update the Homebridge configuration.

## Install through the Homebridge UI

No manual npm command is required for the normal installation flow:

1. Open the Homebridge UI and select **Plugins**.
2. Search for the exact package name `homebridge-tuya-hvac`.
3. Check that the package links to
   `https://github.com/CoStiC/homebridge-tuya-hvac` before installing it.
4. Install the plugin and open its settings.
5. Enter a display name, Device ID, reserved IP address and Local Key.
6. Keep protocol version `3.5` for the IVW Inverter 10.
7. Keep the default 30-second refresh interval unless there is a measured reason
   to change it.
8. Save the configuration and restart Homebridge from the UI when prompted.

If the exact package is not present in the Homebridge search results, wait for
npm indexing rather than installing a similarly named Tuya plugin.

## Validate the installation

After restart:

1. confirm that Homebridge loads `homebridge-tuya-hvac` without a configuration
   error;
2. confirm that the accessory appears in Home;
3. compare the initial power, mode and temperature with the physical heat pump;
4. test one ON/OFF command, one mode change and one target-temperature change;
5. wait for at least one periodic refresh and confirm that the displayed state
   remains synchronized.

The plugin must never print a Device ID, Local Key, HomeKit PIN or raw native
Tuya protocol error. Stop the validation and report a sanitized issue if a
secret appears in the logs.

## Runtime operation

Once the Device ID and Local Key have been obtained, neither TinyTuya nor the
Tuya Cloud is required by the plugin. Homebridge communicates directly with the
heat pump over the LAN.
