# Layer boundaries

```text
HomeKit
  ↓
HeaterCoolerAccessory
  ↓
HvacController
  ↓
HvacGateway
  ↓
TuyaHvacGateway
  ↓
TuyaClient
  ↓
Tuya LAN device
```

## HomeKit adapter

Translates HomeKit characteristics into domain operations and applies confirmed states. It must not know Data Point numbers or Tuya values.

## Application

`HvacController` exposes HVAC use cases and depends only on `HvacGateway`.

## Domain

Defines `HvacState`, `HvacMode` and the gateway contract. It imports neither Homebridge nor Tuya infrastructure.

## Tuya infrastructure

Owns LAN communication, DP mapping, response validation and confirmed write transactions. Only this layer knows DP1, DP2, DP3 and DP4.
