import { GUARDS_METADATA } from "@nestjs/common/constants";
import { ProcurementScopes } from "../app-constants";
import { SCOPES_KEY } from "../auth/decorators/scopes.decorator";
import { ProcurementAccessGuard } from "../auth/guards/procurement-access.guard";
import { InvoicesController } from "./invoices.controller";

describe("InvoicesController", () => {
  const service = {
    findAll: jest.fn(),
    findOverdue: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  let controller: InvoicesController;

  beforeEach(() => {
    Object.values(service).forEach((mock) => mock.mockReset());
    controller = new InvoicesController(service as any);
  });

  it("delegates invoice requests to the service", async () => {
    const response = { id: "invoice-1" };
    const dto = {
      vendorId: "vendor-1",
      invoiceNumber: "INV-1",
      amount: 100,
      invoiceDate: "2026-06-01",
      dueDate: "2026-07-01",
    };
    const query = { state: "pending" };
    service.findAll.mockResolvedValue([response]);
    service.findOverdue.mockResolvedValue([response]);
    service.findOne.mockResolvedValue(response);
    service.create.mockResolvedValue(response);
    service.update.mockResolvedValue(response);
    service.remove.mockResolvedValue(response);

    await expect(controller.findAll(query as any)).resolves.toEqual([response]);
    await expect(controller.findOverdue()).resolves.toEqual([response]);
    await expect(controller.findOne("invoice-1")).resolves.toEqual(response);
    await expect(controller.create(dto as any)).resolves.toEqual(response);
    await expect(controller.update("invoice-1", dto as any)).resolves.toEqual(
      response,
    );
    await expect(controller.remove("invoice-1")).resolves.toEqual(response);

    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(service.findOverdue).toHaveBeenCalledWith();
    expect(service.findOne).toHaveBeenCalledWith("invoice-1");
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(service.update).toHaveBeenCalledWith("invoice-1", dto);
    expect(service.remove).toHaveBeenCalledWith("invoice-1");
  });

  it("uses ProcurementAccessGuard", () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, InvoicesController) ?? [];

    expect(guards).toContain(ProcurementAccessGuard);
  });

  it("declares exact read and write scopes on every handler", () => {
    expectScope("findAll", ProcurementScopes.Read);
    expectScope("findOverdue", ProcurementScopes.Read);
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
function expectScope(method: keyof InvoicesController, scope: string): void {
  expect(
    Reflect.getMetadata(SCOPES_KEY, InvoicesController.prototype[method]),
  ).toEqual([scope]);
}
