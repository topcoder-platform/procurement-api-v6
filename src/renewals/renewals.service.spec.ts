import { BadRequestException } from "@nestjs/common";
import { ContractStatus, RenewalStage } from "@prisma/client";
import { RenewalsService } from "./renewals.service";

const now = new Date("2026-06-27T12:00:00.000Z");

/**
 * Builds a Prisma-like renewal record for service tests.
 *
 * @param overrides Renewal field overrides for each test case.
 * @returns Renewal fixture with contract and vendor context.
 */
function renewalFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "renewal-1",
    contractId: "contract-1",
    renewalTermMonths: 12,
    newStartDate: new Date("2027-01-01T00:00:00.000Z"),
    newEndDate: new Date("2027-12-31T00:00:00.000Z"),
    newValue: 1200,
    stage: RenewalStage.quotation,
    assignee: null,
    notes: null,
    quotationAt: null,
    vraAt: null,
    cioApprovalAt: null,
    legalReviewAt: null,
    orderFormSignedAt: null,
    prCreationAt: null,
    prApprovalsAt: null,
    poReleaseAt: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-02T00:00:00.000Z"),
    contract: {
      id: "contract-1",
      contractNumber: "MSA-1",
      title: "Design Platform",
      status: ContractStatus.active,
      vendor: {
        id: "vendor-1",
        name: "Acme Software",
      },
    },
    ...overrides,
  };
}

describe("RenewalsService", () => {
  const db = {
    renewal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    contract: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let service: RenewalsService;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(now);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    Object.values(db.renewal).forEach((mock) => mock.mockReset());
    db.contract.findUnique.mockReset();
    db.contract.update.mockReset();
    db.$transaction.mockReset();
    db.$transaction.mockImplementation((callback) =>
      callback({
        renewal: db.renewal,
        contract: db.contract,
      }),
    );
    service = new RenewalsService(db as any);
  });

  it("creates renewals at quotation and stamps quotationAt", async () => {
    db.contract.findUnique.mockResolvedValue({ id: "contract-1" });
    db.renewal.create.mockImplementation(({ data }) =>
      Promise.resolve(renewalFixture(data)),
    );

    const result = await service.create({
      contractId: "contract-1",
      renewalTermMonths: 12,
      newStartDate: "2027-01-01",
      newEndDate: "2027-12-31",
      newValue: 1200,
    });

    expect(db.renewal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stage: RenewalStage.quotation,
          quotationAt: now,
        }),
      }),
    );
    expect(result.stage).toBe(RenewalStage.quotation);
    expect(result.stageOrder).toBe(1);
  });

  it("creates renewals using submitted business-day chronology for offset timestamps", async () => {
    db.contract.findUnique.mockResolvedValue({ id: "contract-1" });
    db.renewal.create.mockImplementation(({ data }) =>
      Promise.resolve(renewalFixture(data)),
    );

    const result = await service.create({
      contractId: "contract-1",
      renewalTermMonths: 12,
      newStartDate: "2027-01-01T23:30:00-10:00",
      newEndDate: "2027-01-02T00:30:00+14:00",
      newValue: 1200,
    });

    const createData = db.renewal.create.mock.calls[0][0].data;
    expect(result.id).toBe("renewal-1");
    expect(createData.newStartDate.toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
    expect(createData.newEndDate.toISOString()).toBe(
      "2027-01-02T00:00:00.000Z",
    );
  });

  it("rejects impossible renewal calendar dates as bad requests", async () => {
    let thrown: unknown;

    try {
      await service.create({
        contractId: "contract-1",
        renewalTermMonths: 12,
        newStartDate: "2027-02-31",
        newEndDate: "2027-12-31",
        newValue: 1200,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(BadRequestException);
    expect((thrown as BadRequestException).getStatus()).toBe(400);
    expect(db.contract.findUnique).not.toHaveBeenCalled();
    expect(db.renewal.create).not.toHaveBeenCalled();
  });

  it("updates renewals with normalized midnight UTC business dates", async () => {
    db.renewal.findUnique.mockResolvedValue(renewalFixture());
    db.contract.findUnique.mockResolvedValue({ id: "contract-1" });
    db.renewal.update.mockImplementation(({ data }) =>
      Promise.resolve(renewalFixture(data)),
    );

    await service.update("renewal-1", {
      contractId: "contract-1",
      renewalTermMonths: 24,
      newStartDate: "2027-04-30T23:30:00-10:00",
      newEndDate: "2028-04-30T00:30:00+14:00",
      newValue: 2400,
    });

    const updateData = db.renewal.update.mock.calls[0][0].data;
    expect(updateData.newStartDate.toISOString()).toBe(
      "2027-04-30T00:00:00.000Z",
    );
    expect(updateData.newEndDate.toISOString()).toBe(
      "2028-04-30T00:00:00.000Z",
    );
  });

  it("rejects skipped stage transitions", async () => {
    db.renewal.findUnique.mockResolvedValue(renewalFixture());

    await expect(
      service.transitionStage("renewal-1", RenewalStage.cio_approval),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.renewal.update).not.toHaveBeenCalled();
  });

  it("rolls back one stage without clearing timestamp history", async () => {
    const quotationAt = new Date("2026-06-20T00:00:00.000Z");
    const vraAt = new Date("2026-06-21T00:00:00.000Z");
    db.renewal.findUnique.mockResolvedValue(
      renewalFixture({
        stage: RenewalStage.vra,
        quotationAt,
        vraAt,
      }),
    );
    db.renewal.update.mockResolvedValue(
      renewalFixture({
        stage: RenewalStage.quotation,
        quotationAt,
        vraAt,
      }),
    );

    const result = await service.transitionStage(
      "renewal-1",
      RenewalStage.quotation,
    );

    expect(db.renewal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stage: RenewalStage.quotation },
      }),
    );
    expect(result.quotationAt).toEqual(quotationAt);
    expect(result.vraAt).toEqual(vraAt);
  });

  it("rejects movement after terminal PO release", async () => {
    db.renewal.findUnique.mockResolvedValue(
      renewalFixture({ stage: RenewalStage.po_release }),
    );

    await expect(
      service.transitionStage("renewal-1", RenewalStage.pr_approvals),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.renewal.update).not.toHaveBeenCalled();
  });

  it("finalizes PO release and updates contract dates and value in a transaction", async () => {
    const renewal = renewalFixture({
      stage: RenewalStage.pr_approvals,
      newStartDate: new Date("2027-07-01T00:00:00.000Z"),
      newEndDate: new Date("2028-06-30T00:00:00.000Z"),
      newValue: 1500,
    });
    db.renewal.findUnique.mockResolvedValue(renewal);
    db.renewal.update.mockResolvedValue(
      renewalFixture({
        stage: RenewalStage.po_release,
        poReleaseAt: now,
        newValue: 1500,
      }),
    );
    db.contract.update.mockResolvedValue({});

    await service.transitionStage("renewal-1", RenewalStage.po_release);

    expect(db.$transaction).toHaveBeenCalled();
    expect(db.contract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "contract-1" },
      }),
    );

    const contractUpdateData = db.contract.update.mock.calls[0][0].data;
    expect(contractUpdateData.startDate.toISOString()).toBe(
      "2027-07-01T00:00:00.000Z",
    );
    expect(contractUpdateData.endDate.toISOString()).toBe(
      "2028-06-30T00:00:00.000Z",
    );
    expect(contractUpdateData.value).toBe(1500);
  });

  it("finalizes PO release without updating contract value when newValue is absent", async () => {
    const renewal = renewalFixture({
      stage: RenewalStage.pr_approvals,
      newValue: null,
    });
    db.renewal.findUnique.mockResolvedValue(renewal);
    db.renewal.update.mockResolvedValue(
      renewalFixture({
        stage: RenewalStage.po_release,
        poReleaseAt: now,
        newValue: null,
      }),
    );
    db.contract.update.mockResolvedValue({});

    await service.transitionStage("renewal-1", RenewalStage.po_release);

    expect(db.contract.update).toHaveBeenCalledWith({
      where: { id: "contract-1" },
      data: {
        startDate: renewal.newStartDate,
        endDate: renewal.newEndDate,
      },
    });
  });

  it("reactivates a stored-expired contract when PO release is finalized", async () => {
    const renewal = renewalFixture({
      stage: RenewalStage.pr_approvals,
      contract: {
        id: "contract-1",
        contractNumber: "MSA-1",
        title: "Design Platform",
        status: ContractStatus.expired,
        vendor: {
          id: "vendor-1",
          name: "Acme Software",
        },
      },
    });
    db.renewal.findUnique.mockResolvedValue(renewal);
    db.renewal.update.mockResolvedValue(
      renewalFixture({
        stage: RenewalStage.po_release,
        poReleaseAt: now,
      }),
    );
    db.contract.update.mockResolvedValue({});

    await service.transitionStage("renewal-1", RenewalStage.po_release);

    expect(db.contract.update).toHaveBeenCalledWith({
      where: { id: "contract-1" },
      data: {
        startDate: renewal.newStartDate,
        endDate: renewal.newEndDate,
        value: 1200,
        status: ContractStatus.active,
      },
    });
  });
});
