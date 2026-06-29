import { BadRequestException } from "@nestjs/common";
import { InvoiceStatus } from "@prisma/client";
import {
  INVOICE_PAYMENT_STATES,
  deriveInvoicePaymentState,
} from "./invoice-payment-state.helpers";
import { InvoicesService } from "./invoices.service";

const now = new Date("2026-06-27T12:00:00.000Z");

/**
 * Builds a Prisma-like invoice record for service tests.
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
    dueDate: new Date("2026-07-01T00:00:00.000Z"),
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

describe("InvoicesService", () => {
  const db = {
    invoice: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vendor: {
      findUnique: jest.fn(),
    },
    contract: {
      findUnique: jest.fn(),
    },
  };
  let service: InvoicesService;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(now);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(now);
    Object.values(db.invoice).forEach((mock) => mock.mockReset());
    db.vendor.findUnique.mockReset();
    db.contract.findUnique.mockReset();
    service = new InvoicesService(db as any);
  });

  it("derives pending and overdue states in invoice lists", async () => {
    db.invoice.findMany.mockResolvedValue([
      invoiceFixture({
        id: "pending",
        dueDate: new Date("2026-07-01T00:00:00.000Z"),
      }),
      invoiceFixture({
        id: "overdue",
        dueDate: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ]);

    const result = await service.findAll();

    expect(result.map((invoice) => invoice.paymentState)).toEqual([
      INVOICE_PAYMENT_STATES.Pending,
      INVOICE_PAYMENT_STATES.Overdue,
    ]);
  });

  it("uses the same derivation for the overdue endpoint", async () => {
    db.invoice.findMany.mockResolvedValue([
      invoiceFixture({ dueDate: new Date("2026-06-01T00:00:00.000Z") }),
    ]);

    const result = await service.findOverdue();

    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueDate: { lt: expect.any(Date) },
        }),
      }),
    );
    expect(result[0].paymentState).toBe(INVOICE_PAYMENT_STATES.Overdue);
    expect(
      deriveInvoicePaymentState({
        status: InvoiceStatus.issued,
        dueDate: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ).toBe(INVOICE_PAYMENT_STATES.Overdue);
  });

  it("uses UTC business-day boundaries for the overdue endpoint", async () => {
    jest.setSystemTime(new Date("2026-07-01T00:30:00.000+14:00"));
    db.invoice.findMany.mockResolvedValue([
      invoiceFixture({ dueDate: new Date("2026-06-29T00:00:00.000Z") }),
    ]);

    const result = await service.findOverdue();
    const dueDateFilter = db.invoice.findMany.mock.calls[0][0].where.dueDate;

    expect(dueDateFilter.lt.toISOString()).toBe("2026-06-30T00:00:00.000Z");
    expect(result).toHaveLength(1);
    expect(result[0].paymentState).toBe(INVOICE_PAYMENT_STATES.Overdue);
  });

  it("filters invoices by UTC-derived payment state at non-UTC boundaries", async () => {
    jest.setSystemTime(new Date("2026-07-01T00:30:00.000+14:00"));
    db.invoice.findMany.mockResolvedValue([
      invoiceFixture({
        id: "overdue",
        dueDate: new Date("2026-06-29T00:00:00.000Z"),
      }),
      invoiceFixture({
        id: "pending",
        dueDate: new Date("2026-06-30T00:00:00.000Z"),
      }),
    ]);

    const result = await service.findAll({
      state: INVOICE_PAYMENT_STATES.Overdue,
    });

    expect(result.map((invoice) => invoice.id)).toEqual(["overdue"]);
  });

  it("uses UTC-derived payment state for dashboard invoice totals", async () => {
    jest.setSystemTime(new Date("2026-07-01T00:30:00.000+14:00"));
    db.invoice.findMany.mockResolvedValue([
      invoiceFixture({
        id: "overdue",
        amount: 100,
        dueDate: new Date("2026-06-29T00:00:00.000Z"),
      }),
      invoiceFixture({
        id: "pending",
        amount: 200,
        dueDate: new Date("2026-06-30T00:00:00.000Z"),
      }),
    ]);

    await expect(service.getDashboardBuckets()).resolves.toEqual({
      pending: { count: 1, total: 200 },
      overdue: { count: 1, total: 100 },
    });
  });

  it("rejects invoice contract links that belong to another vendor", async () => {
    db.vendor.findUnique.mockResolvedValue({ id: "vendor-1" });
    db.contract.findUnique.mockResolvedValue({
      id: "contract-1",
      vendorId: "vendor-2",
    });

    await expect(
      service.create({
        vendorId: "vendor-1",
        contractId: "contract-1",
        invoiceNumber: "INV-1",
        amount: 100,
        invoiceDate: "2026-06-01",
        dueDate: "2026-07-01",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.invoice.create).not.toHaveBeenCalled();
  });

  it("persists incoming invoice dates as UTC business dates", async () => {
    db.vendor.findUnique.mockResolvedValue({ id: "vendor-1" });
    db.contract.findUnique.mockResolvedValue({
      id: "contract-1",
      vendorId: "vendor-1",
    });
    db.invoice.create.mockImplementation(({ data }) =>
      Promise.resolve(invoiceFixture(data)),
    );

    await service.create({
      vendorId: "vendor-1",
      contractId: "contract-1",
      invoiceNumber: "INV-1",
      amount: 100,
      invoiceDate: "2026-07-01T23:30:00.000-05:00",
      dueDate: "2026-07-31T00:30:00.000+14:00",
      paidDate: "2026-08-01T00:30:00.000+14:00",
      status: InvoiceStatus.paid,
    });

    const data = db.invoice.create.mock.calls[0][0].data;
    expect(data.invoiceDate.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(data.dueDate.toISOString()).toBe("2026-07-31T00:00:00.000Z");
    expect(data.paidDate.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("preserves paid invoice status and paidDate when omitted during update", async () => {
    const paidDate = new Date("2026-07-01T00:00:00.000Z");
    const existing = invoiceFixture({
      status: InvoiceStatus.paid,
      paidDate,
    });
    db.invoice.findUnique.mockResolvedValue(existing);
    db.vendor.findUnique.mockResolvedValue({ id: "vendor-1" });
    db.contract.findUnique.mockResolvedValue({
      id: "contract-1",
      vendorId: "vendor-1",
    });
    db.invoice.update.mockImplementation(({ data }) =>
      Promise.resolve(invoiceFixture({ ...existing, ...data })),
    );

    const result = await service.update("invoice-1", {
      vendorId: "vendor-1",
      invoiceNumber: "INV-1A",
      amount: 125,
      invoiceDate: "2026-06-01",
      dueDate: "2026-07-01",
    });
    const data = db.invoice.update.mock.calls[0][0].data;

    expect(data).toEqual(
      expect.objectContaining({
        contractId: "contract-1",
        paidDate,
        status: InvoiceStatus.paid,
      }),
    );
    expect(result.status).toBe(InvoiceStatus.paid);
    expect(result.paidDate).toBe(paidDate);
    expect(result.paymentState).toBe(INVOICE_PAYMENT_STATES.Paid);
  });
});
