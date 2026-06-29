import { GUARDS_METADATA } from "@nestjs/common/constants";
import { ProcurementScopes } from "../app-constants";
import { SCOPES_KEY } from "../auth/decorators/scopes.decorator";
import { ProcurementAccessGuard } from "../auth/guards/procurement-access.guard";
import { DashboardController } from "./dashboard.controller";

describe("DashboardController", () => {
  const service = {
    getSummary: jest.fn(),
  };
  let controller: DashboardController;

  beforeEach(() => {
    service.getSummary.mockReset();
    controller = new DashboardController(service as any);
  });

  it("delegates dashboard requests to the service", async () => {
    const response = { vendorCount: 1 };
    service.getSummary.mockResolvedValue(response);

    await expect(controller.getSummary()).resolves.toEqual(response);

    expect(service.getSummary).toHaveBeenCalledWith();
  });

  it("uses ProcurementAccessGuard", () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, DashboardController) ?? [];

    expect(guards).toContain(ProcurementAccessGuard);
  });

  it("declares exact read scope on the handler", () => {
    expect(
      Reflect.getMetadata(SCOPES_KEY, DashboardController.prototype.getSummary),
    ).toEqual([ProcurementScopes.Read]);
  });
});
