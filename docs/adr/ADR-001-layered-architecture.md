# ADR-001 — Layered architecture

## Status

Accepted.

## Decision

Dependencies flow from HomeKit through the application and domain contracts into Tuya infrastructure. The domain never imports Homebridge or Tuya types, and Data Points remain confined to `src/tuya/`.

## Consequences

HomeKit presentation, HVAC concepts and protocol details can evolve independently. Each functional increment must cross the layers through explicit domain operations rather than bypassing them.
