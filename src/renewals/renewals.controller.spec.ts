import { GUARDS_METADATA } from "@nestjs/common/constants";
import { RenewalStage } from "@prisma/client";
import { ProcurementScopes } from "../app-constants";
import { SCOPES_KEY } from "../auth/decorators/scopes.decorator";
import { ProcurementAccessGuard } from "../auth/guards/procurement-access.guard";
import { RenewalsController } from "./renewals.controller";

describe("RenewalsController", () => {
  const service = {
    findAll: jest.fn(),
    listStages: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    transitionStage: jest.fn(),
    remove: jest.fn(),
  };
  let controller: RenewalsController;

  beforeEach(() => {
    Object.values(service).forEach((mock) => mock.mockReset());
    controller = new RenewalsController(service as any);
  });

  it("delegates renewal requests to the service", async () => {
    const response = { id: "renewal-1" };
    const dto = {
      contractId: "contract-1",
      renewalTermMonths: 12,
      newStartDate: "2027-01-01",
      newEndDate: "2027-12-31",
    };
    service.findAll.mockResolvedValue([response]);
    service.listStages.mockReturnValue([{ stage: RenewalStage.quotation }]);
    service.findOne.mockResolvedValue(response);
    service.create.mockResolvedValue(response);
    service.update.mockResolvedValue(response);
    service.transitionStage.mockResolvedValue(response);
    service.remove.mockResolvedValue(response);

    await expect(controller.findAll()).resolves.toEqual([response]);
    expect(controller.listStages()).toEqual([
      { stage: RenewalStage.quotation },
    ]);
    await expect(controller.findOne("renewal-1")).resolves.toEqual(response);
    await expect(controller.create(dto as any)).resolves.toEqual(response);
    await expect(controller.update("renewal-1", dto as any)).resolves.toEqual(
      response,
    );
    await expect(
      controller.transitionStage("renewal-1", {
        targetStage: RenewalStage.vra,
      }),
    ).resolves.toEqual(response);
    await expect(controller.remove("renewal-1")).resolves.toEqual(response);

    expect(service.findAll).toHaveBeenCalledWith();
    expect(service.listStages).toHaveBeenCalledWith();
    expect(service.findOne).toHaveBeenCalledWith("renewal-1");
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(service.update).toHaveBeenCalledWith("renewal-1", dto);
    expect(service.transitionStage).toHaveBeenCalledWith(
      "renewal-1",
      RenewalStage.vra,
    );
    expect(service.remove).toHaveBeenCalledWith("renewal-1");
  });

  it("uses ProcurementAccessGuard", () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, RenewalsController) ?? [];

    expect(guards).toContain(ProcurementAccessGuard);
  });

  it("declares exact read and write scopes on every handler", () => {
    expectScope("findAll", ProcurementScopes.Read);
    expectScope("listStages", ProcurementScopes.Read);
    expectScope("findOne", ProcurementScopes.Read);
    expectScope("create", ProcurementScopes.Write);
    expectScope("update", ProcurementScopes.Write);
    expectScope("transitionStage", ProcurementScopes.Write);
    expectScope("remove", ProcurementScopes.Write);
  });
});

/**
 * Asserts that a controller handler has exactly one expected scope.
 *
 * @param method Controller method name to inspect.
 * @param scope Expected procurement scope metadata.
 * @returns Nothing; Jest assertions validate the metadata.
 */
function expectScope(method: keyof RenewalsController, scope: string): void {
  expect(
    Reflect.getMetadata(SCOPES_KEY, RenewalsController.prototype[method]),
  ).toEqual([scope]);
}
