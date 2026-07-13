# IVW Inverter 10 profile

## Transport

- Tuya LAN protocol 3.5
- local-only runtime operation

## Operating modes

| Domain mode   | DP4 value    | HomeKit V1                   |
| ------------- | ------------ | ---------------------------- |
| Auto          | `auto`       | AUTO                         |
| Heat          | `heat`       | HEAT                         |
| Cool          | `cool`       | COOL                         |
| Powerful heat | `powerful_h` | mapped as HEAT on reads only |
| Powerful cool | `powerful_c` | mapped as COOL on reads only |
| Silent heat   | `silent_h`   | mapped as HEAT on reads only |
| Silent cool   | `silent_c`   | mapped as COOL on reads only |

All seven values were accepted and confirmed experimentally with the device powered off. V1 writes only `auto`, `heat` and `cool` from HomeKit.

The V1 values `auto`, `heat` and `cool` were also validated end to end from the Home application while the device was active. Each DP4 write was followed by a complete status read that confirmed the requested mode.

## Target temperature

- minimum: 8 °C
- maximum: 32 °C
- step: 1 °C
- one device setpoint; no validated independent heating/cooling setpoints

DP2 accepts and confirms integer values in this range. Values outside the range are clamped by the device, so the adapter rejects them before writing rather than accepting a different confirmed value. A 29.5 °C experiment produced an unexplained DP2 value of 32 °C; fractional writes are therefore rejected in V1.

The confirmed-write pipeline for DP2 uses a complete pre-read, skips redundant writes, then requires a complete status response whose target temperature exactly matches the requested value. It was validated end to end through HomeKit with the sequence 30 → 29 → 31 → 30 °C on the real device.
