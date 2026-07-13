# Testing

After every code change run under Node.js 22 or 24:

```bash
npm run format
npm run typecheck
npm run lint
npm test
npm run build
```

Unit tests cover domain mapping, complete reads, confirmed and rejected writes, transaction serialization, HomeKit translation and request coalescing.

Protocol-facing increments also require isolated real-device validation using `homebridge-dev/`. Automated tests do not prove LAN timing or physical device behavior. Never inspect or publish the sensitive development configuration or raw logs containing credentials and identifiers.
