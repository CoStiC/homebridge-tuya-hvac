import type { HvacGateway } from '../domain/hvac-gateway.js';
import type { HvacState } from '../domain/hvac-state.js';

export class HvacController {
  public constructor(private readonly gateway: HvacGateway) {}

  public getState(): Promise<HvacState> {
    return this.gateway.getState();
  }

  public setActive(active: boolean): Promise<HvacState> {
    return this.gateway.setActive(active);
  }
}
