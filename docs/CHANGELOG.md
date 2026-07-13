# Changelog

## 0.1.0 — 2026-07-13

### Added

- Minimal local npm package with a root user guide and documented installation procedure.
- Read-only GitHub Actions validation on Node.js 22 and 24.
- MIT licensing and public repository, homepage and issue-tracker metadata.
- Confirmed independent ON/OFF control through HomeKit `HeaterCooler.Active`.
- Background HomeKit commands with latest-intention coalescing.
- Confirmed DP4 mode pipeline for HomeKit AUTO, HEAT and COOL, validated end to end with the real device.
- Confirmed DP2 target-temperature pipeline shared by the HomeKit heating and cooling thresholds, validated end to end with the real device.

### Reliability

- Complete-state validation rejects partial Tuya responses.
- Per-device transactions are serialized.
- Ambiguous writes use bounded explicit confirmation reads and one idempotent write retry.
- Configurable periodic state synchronization, with a 30-second default, overlap protection, timeout recovery and clean shutdown, validated with external ON/OFF changes.
- HomeKit communication-error state after three consecutive refresh failures, with deduplicated transition logs and automatic recovery from confirmed state, validated through a real network interruption.
- Native TuyAPI errors are normalized before reaching Homebridge logs so protocol details, device identifiers and Local Keys are not exposed.
