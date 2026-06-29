import { GUARDS_METADATA } from "@nestjs/common/constants";
import { ProcurementScopes } from "../app-constants";
import { SCOPES_KEY } from "../auth/decorators/scopes.decorator";
import { ProcurementAccessGuard } from "../auth/guards/procurement-access.guard";
import { VendorsController } from "./vendors.controller";

describe("VendorsController", () => {
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  let controller: VendorsController;

  beforeEach(() => {
    Object.values(service).forEach((mock) => mock.mockReset());
    controller = new VendorsController(service as any);
  });

  it("delegates vendor requests to the service", async () => {
    const response = { id: "vendor-1" };
    const dto = { name: "Acme Software" };
    service.findAll.mockResolvedValue([response]);
    service.findOne.mockResolvedValue(response);
    service.create.mockResolvedValue(response);
    service.update.mockResolvedValue(response);
    service.remove.mockResolvedValue(response);

    await expect(controller.findAll()).resolves.toEqual([response]);
    await expect(controller.findOne("vendor-1")).resolves.toEqual(response);
    await expect(controller.create(dto as any)).resolves.toEqual(response);
    await expect(controller.update("vendor-1", dto as any)).resolves.toEqual(
      response,
    );
    await expect(controller.remove("vendor-1")).resolves.toEqual(response);

    expect(service.findAll).toHaveBeenCalledWith();
    expect(service.findOne).toHaveBeenCalledWith("vendor-1");
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(service.update).toHaveBeenCalledWith("vendor-1", dto);
    expect(service.remove).toHaveBeenCalledWith("vendor-1");
  });

  it("uses ProcurementAccessGuard", () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, VendorsController) ?? [];

    expect(guards).toContain(ProcurementAccessGuard);
  });

  it("declares exact read and write scopes on every handler", () => {
    expectScope("findAll", ProcurementScopes.Read);
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
function expectScope(method: keyof VendorsController, scope: string): void {
  expect(
    Reflect.getMetadata(SCOPES_KEY, VendorsController.prototype[method]),
  ).toEqual([scope]);
}
