# ADR-002 — Confirmed writes

## Status

Accepted.

## Context

Tuya write completion and response payloads do not reliably prove the resulting device state.

## Decision

Every write is followed by explicit complete reads. The requested field is verified and a complete confirmed `HvacState` is returned. Partial responses and optimistic HomeKit updates are rejected.

## Consequences

Commands may take longer, but HomeKit ultimately reflects device truth. The adapter runs long transactions in the background and resynchronizes after relevant failures.
