# Validated Data Points

IVW Inverter 10, Tuya LAN 3.5:

| DP  | Meaning             | Domain type   |
| --- | ------------------- | ------------- |
| 1   | Power               | boolean       |
| 2   | Target temperature  | finite number |
| 3   | Current temperature | finite number |
| 4   | Operating mode      | `HvacMode`    |
| 13  | Unknown             | not mapped    |

DP knowledge is confined to `src/tuya/ivw-inverter-10-profile.ts` and the Tuya infrastructure layer.
