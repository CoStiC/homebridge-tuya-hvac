# ADR-003 — Command serialization and coalescing

## Status

Accepted.

## Context

Overlapping Tuya operations caused ambiguous responses, while serializing every rapid HomeKit gesture replayed stale intentions long after the user changed their mind.

## Decision

`TuyaHvacGateway` serializes every transaction for a device. The HomeKit adapter retains only the latest pending intention per characteristic while allowing the in-flight transaction to complete.

## Consequences

Protocol operations never overlap. HomeKit stays responsive, intermediate intentions are discarded, and obsolete results or resynchronizations do not overwrite a newer user intention.
