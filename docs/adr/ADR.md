# Architecture Decision Records

This directory contains the accepted architectural decisions for Homebridge Tuya HVAC.

## Canonical records

| ID                                          | Decision                                     | Status   |
| ------------------------------------------- | -------------------------------------------- | -------- |
| [ADR-001](ADR-001-layered-architecture.md)  | Layered architecture                         | Accepted |
| [ADR-002](ADR-002-confirmed-write.md)       | Confirmed writes                             | Accepted |
| [ADR-003](ADR-003-command-serialization.md) | Command serialization and HomeKit coalescing | Accepted |

New decisions receive the next available identifier and live in a dedicated file. Existing identifiers are never reused for a different decision.

## Decisions imported from the original project draft

The original monolithic ADR document recorded the following accepted principles before individual ADR files were introduced:

- develop a dedicated plugin rather than inherit an unsuitable legacy design;
- use LAN-only communication at runtime;
- treat experimentally validated LAN behavior as authoritative over vendor metadata;
- confine Tuya Data Points to infrastructure;
- expose one native HomeKit `HeaterCooler` service;
- follow evidence-driven development and architecture-before-implementation;
- keep the HVAC domain independent from Homebridge and Tuya;
- maintain `docs/` as the durable technical Knowledge Base and Notion as the work-in-progress space.

TinyTuya was also recorded as a temporary reverse-engineering reference, never as a runtime dependency. These imported principles remain applicable where they do not conflict with a canonical ADR. They should be promoted to dedicated records only when a future change requires revisiting their rationale or consequences.
