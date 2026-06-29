import { ContractStatus, InvoiceStatus, RenewalStage } from "@prisma/client";
import { ContractsService } from "../contracts/contracts.service";
import { InvoicesService } from "../invoices/invoices.service";
import { RenewalsService } from "../renewals/renewals.service";
import { DashboardService } from "./dashboard.service";

const now = new Date("2026-06-27T12:00:00.000Z");

/**
 * Builds a Prisma-like contract record for dashboard composition tests.
 *
 * @param overrides Contract field overrides for each test case.
 * @returns Contract fixture with an embedded vendor summary.
 */
function contractFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "contract-1",
    vendorId: "vendor-1",
    contractNumber: "MSA-1",
    title: "Design Platform",
    description: null,
    startDate: new Date("2025-01-01T00:00:00.000Z"),
    endDate: new Date("2026-01-01T00:00:00.000Z"),
    value: 1000,
    autoRenew: false,
    renewalNoticeDays: 30,
    status: ContractStatus.expired,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-02T00:00:00.000Z"),
    vendor: {
      id: "vendor-1",
      name: "Acme Software",
      category: "Software",
    },
    ...overrides,
  };
}

/**
 * Builds a Prisma-like renewal record for dashboard composition tests.
 *
 * @param overrides Renewal field overrides for each test case.
 * @returns Renewal fixture with contract and vendor context.
 */
function renewalFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "renewal-1",
    contractId: "contract-1",
    renewalTermMonths: 12,
    newStartDate: new Date("2026-07-01T00:00:00.000Z"),
    newEndDate: new Date("2026-07-15T00:00:00.000Z"),
    newValue: 1200,
    stage: RenewalStage.pr_approvals,
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
      status: ContractStatus.expired,
      vendor: {
        id: "vendor-1",
        name: "Acme Software",
      },
    },
    ...overrides,
  };
}

/**
 * Builds a Prisma-like invoice record for dashboard composition tests.
 *
 * @param overrides Invoice field overrides for each test case.
 * @returns Invoice fixture with vendor and optional contract summaries.
 */
function invoiceFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "invoice-1",
    vendorId: "vendor-1",
    contractId: "contract-1",
    invoiceNumber: "INV-1",
    amount: 100,
    invoiceDate: new Date("2026-06-01T00:00:00.000Z"),
    dueDate: new Date("2026-06-01T00:00:00.000Z"),
    paidDate: null,
    status: InvoiceStatus.issued,
    description: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-02T00:00:00.000Z"),
    vendor: {
      id: "vendor-1",
      name: "Acme Software",
    },
    contract: {
      id: "contract-1",
      contractNumber: "MSA-1",
      title: "Design Platform",
      vendorId: "vendor-1",
    },
    ...overrides,
  };
}

describe("DashboardService", () => {
  const vendorsService = {
    count: jest.fn(),
  };
  const contractsService = {
    countActive: jest.fn(),
    findExpiring: jest.fn(),
  };
  const invoicesService = {
    getDashboardBuckets: jest.fn(),
  };
  const renewalsService = {
    countActive: jest.fn(),
  };
  let service: DashboardService;

  beforeEach(() => {
    vendorsService.count.mockReset();
    contractsService.countActive.mockReset();
    contractsService.findExpiring.mockReset();
    invoicesService.getDashboardBuckets.mockReset();
    renewalsService.countActive.mockReset();
    service = new DashboardService(
      vendorsService as any,
      contractsService as any,
      invoicesService as any,
      renewalsService as any,
    );
  });

  it("returns summary counts and totals using shared alert logic", async () => {
    vendorsService.count.mockResolvedValue(10);
    contractsService.countActive.mockResolvedValue(4);
    contractsService.findExpiring.mockResolvedValue([
      { id: "contract-1" },
      { id: "contract-2" },
      { id: "contract-3" },
      { id: "contract-4" },
      { id: "contract-5" },
      { id: "contract-6" },
    ]);
    invoicesService.getDashboardBuckets.mockResolvedValue({
      pending: { count: 3, total: 300 },
      overdue: { count: 2, total: 125 },
    });
    renewalsService.countActive.mockResolvedValue(5);

    const result = await service.getSummary();

    expect(contractsService.findExpiring).toHaveBeenCalledWith();
    expect(result).toEqual({
      vendorCount: 10,
      activeContractCount: 4,
      pendingInvoiceCount: 3,
      pendingInvoiceTotal: 300,
      overdueInvoiceCount: 2,
      overdueInvoiceTotal: 125,
      expiringContractCount: 6,
      expiringContracts: [
        { id: "contract-1" },
        { id: "contract-2" },
        { id: "contract-3" },
        { id: "contract-4" },
        { id: "contract-5" },
      ],
      activeRenewalCount: 5,
    });
  });

  it("includes stored-expired contracts in active dashboard queries after renewal PO release", async () => {
    jest.useFakeTimers().setSystemTime(now);
    let contract = contractFixture();
    const renewal = renewalFixture();
    const db = {
      contract: {
        count: jest.fn(({ where }) =>
          Promise.resolve(
            contract.status === where.status &&
              contract.endDate >= where.endDate.gte
              ? 1
              : 0,
          ),
        ),
        findMany: jest.fn(({ where }) =>
          Promise.resolve(
            contract.status === where.status &&
              contract.endDate >= where.endDate.gte &&
              contract.endDate <= where.endDate.lte
              ? [contract]
              : [],
          ),
        ),
        update: jest.fn(({ data }) => {
          contract = contractFixture({ ...contract, ...data });
          return Promise.resolve(contract);
        }),
        findUnique: jest.fn(),
      },
      renewal: {
        findUnique: jest.fn().mockResolvedValue(renewal),
        update: jest.fn(({ data }) =>
          Promise.resolve(renewalFixture({ ...renewal, ...data })),
        ),
        count: jest.fn().mockResolvedValue(0),
      },
      invoice: {
        findMany: jest.fn().mockResolvedValue([
          invoiceFixture({
            id: "overdue",
            amount: 100,
            dueDate: new Date("2026-06-01T00:00:00.000Z"),
          }),
        ]),
      },
      $transaction: jest.fn((callback) =>
        callback({
          contract: db.contract,
          renewal: db.renewal,
        }),
      ),
    };
    const renewalService = new RenewalsService(db);
    const dashboard = new DashboardService(
      { count: jest.fn().mockResolvedValue(1) } as any,
      new ContractsService(db),
      new InvoicesService(db),
      renewalService,
    );

    try {
      await renewalService.transitionStage(
        "renewal-1",
        RenewalStage.po_release,
      );
      const result = await dashboard.getSummary();

      expect(db.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ContractStatus.active }),
        }),
      );
      expect(result.activeContractCount).toBe(1);
      expect(result.expiringContractCount).toBe(1);
      expect(result.expiringContracts[0].id).toBe("contract-1");
      expect(result.overdueInvoiceCount).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
