import { GUARDS_METADATA } from "@nestjs/common/constants";
import { ProcurementScopes } from "../app-constants";
import { SCOPES_KEY } from "../auth/decorators/scopes.decorator";
import { ProcurementAccessGuard } from "../auth/guards/procurement-access.guard";
import { ContractsController } from "./contracts.controller";

describe("ContractsController", () => {
  const service = {
    findAll: jest.fn(),
    findExpiring: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  let controller: ContractsController;

  beforeEach(() => {
    Object.values(service).forEach((mock) => mock.mockReset());
    controller = new ContractsController(service as any);
  });

  it("delegates contract requests to the service", async () => {
    const response = { id: "contract-1" };
    const dto = {
      vendorId: "vendor-1",
      contractNumber: "MSA-1",
      title: "Design Platform",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      value: 1000,
    };
    const query = { days: 45 };
    service.findAll.mockResolvedValue([response]);
    service.findExpiring.mockResolvedValue([response]);
    service.findOne.mockResolvedValue(response);
    service.create.mockResolvedValue(response);
    service.update.mockResolvedValue(response);
    service.remove.mockResolvedValue(response);

    await expect(controller.findAll()).resolves.toEqual([response]);
    await expect(controller.findExpiring(query)).resolves.toEqual([response]);
    await expect(controller.findOne("contract-1")).resolves.toEqual(response);
    await expect(controller.create(dto as any)).resolves.toEqual(response);
    await expect(controller.update("contract-1", dto as any)).resolves.toEqual(
      response,
    );
    await expect(controller.remove("contract-1")).resolves.toEqual(response);

    expect(service.findAll).toHaveBeenCalledWith();
    expect(service.findExpiring).toHaveBeenCalledWith(query);
    expect(service.findOne).toHaveBeenCalledWith("contract-1");
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(service.update).toHaveBeenCalledWith("contract-1", dto);
    expect(service.remove).toHaveBeenCalledWith("contract-1");
  });

  it("uses ProcurementAccessGuard", () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, ContractsController) ?? [];

    expect(guards).toContain(ProcurementAccessGuard);
  });

  it("declares exact read and write scopes on every handler", () => {
    expectScope("findAll", ProcurementScopes.Read);
    expectScope("findExpiring", ProcurementScopes.Read);
    expectScope("findOne", ProcurementScopes.Read);
    expectScope("create", ProcurementScopes.Write);
    expectScope("update", ProcurementScopes.Write);
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
function expectScope(method: keyof ContractsController, scope: string): void {
  expect(
    Reflect.getMetadata(SCOPES_KEY, ContractsController.prototype[method]),
  ).toEqual([scope]);
}
