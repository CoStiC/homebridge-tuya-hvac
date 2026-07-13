# Roadmap

> **Project:** Homebridge Tuya HVAC
>
> **Status:** Reference documentation
>
> This document describes the long-term vision and major milestones of the project.
>
> It is not a backlog.
>
> Implementation details, bugs and ongoing work are managed separately in the Notion workspace.

---

# Vision

Homebridge Tuya HVAC aims to provide a robust, local-first and extensible Homebridge plugin for Tuya-compatible HVAC devices.

The project follows a business-domain-driven architecture in which communication protocols, Homebridge and HomeKit remain implementation details.

The first supported device is the **IVW Inverter 10 swimming pool heat pump**.

The architecture is intentionally designed to support additional Tuya-compatible HVAC devices in the future.

---

# Guiding Principles

Every milestone should deliver a working software increment.

The project always prioritizes:

- software quality;
- maintainability;
- simplicity;
- architecture;
- user experience.

---

# Milestone 0.1 — Foundations

## Objectives

- establish the reference architecture;
- implement the HVAC business domain;
- implement the Tuya communication layer;
- expose the first HomeKit integration;
- validate reliable LAN communication.

## Exit Criteria

The plugin can reliably control the first supported HVAC device using HomeKit without any Cloud dependency.

---

# Milestone 0.2 — User Experience

## Objectives

Improve usability and operational reliability.

Examples include:

- automatic reconnection;
- improved error handling;
- Homebridge UI configuration;
- state synchronization;
- logging improvements.

## Exit Criteria

The plugin is easy to install, configure and operate.

---

# Milestone 0.3 — Advanced HVAC Features

## Objectives

Support additional capabilities exposed by compatible HVAC devices.

Potential features include:

- advanced operating modes;
- additional Data Points;
- diagnostics;
- energy information;
- operational status.

## Exit Criteria

The plugin fully exploits the capabilities of supported devices while remaining architecture-compliant.

---

# Milestone 0.4 — Multi-Device Support

## Objectives

Extend support to additional Tuya-compatible HVAC devices.

The architecture should accommodate:

- different device models;
- firmware variations;
- Data Point variations;
- capability detection.

## Exit Criteria

Supporting a new device requires only minimal adaptations to the communication layer.

---

# Milestone 0.5 — Native Communication Layer

## Objectives

Replace the current reference implementation with a native TypeScript implementation.

The migration will only occur when feature parity and reliability have been achieved.

## Exit Criteria

The plugin no longer relies on Python during development or validation.

---

# Milestone 1.0 — First Stable Release

## Objectives

Deliver the first production-ready version.

Requirements include:

- complete documentation;
- stable architecture;
- automated tests;
- GitHub publication;
- npm publication.

## Exit Criteria

The plugin is considered production-ready.

---

# Future Directions

Potential future evolutions include:

- support for additional HVAC vendors;
- richer HomeKit integration;
- diagnostics;
- statistics;
- energy monitoring;
- Home Assistant integration;
- command-line utilities;
- automation integrations (e.g. n8n).

These evolutions must remain consistent with the project's architectural principles.

---

# Success Criteria

The project will be considered successful when:

- it operates entirely over LAN;
- it no longer depends on the Tuya Cloud during normal operation;
- the architecture remains simple and maintainable;
- new HVAC devices can be added without impacting the business domain;
- a new contributor can understand the project by reading the Knowledge Base.
