import { BadRequestException } from "@nestjs/common";
import { ContractStatus } from "@prisma/client";
import {
  CONTRACT_LIFECYCLE,
  deriveContractLifecycle,
} from "./contract-lifecycle.helpers";
import { ContractsService } from "./contracts.service";

const now = new Date("2026-06-27T12:00:00.000Z");

/**
 * Builds a Prisma-like contract record for service tests.
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
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: new Date("2026-07-15T00:00:00.000Z"),
    value: 1000,
    autoRenew: false,
    renewalNoticeDays: 30,
    status: ContractStatus.active,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    vendor: {
      id: "vendor-1",
      name: "Acme Software",
      category: "Software",
    },
    ...overrides,
  };
}

describe("ContractsService", () => {
  const db = {
    contract: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    vendor: {
      findUnique: jest.fn(),
    },
  };
  let service: ContractsService;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(now);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(now);
    Object.values(db.contract).forEach((mock) => mock.mockReset());
    db.vendor.findUnique.mockReset();
    service = new ContractsService(db as any);
  });

  it("returns contracts in the expiry window with derived lifecycle", async () => {
    db.contract.findMany.mockResolvedValue([contractFixture()]);

    const result = await service.findExpiring({ days: 30 });

    expect(db.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ContractStatus.active,
          endDate: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
        orderBy: { endDate: "asc" },
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].lifecycle).toBe(CONTRACT_LIFECYCLE.Expiring);
  });

  it("uses UTC business-day boundaries for expiring queries", async () => {
    jest.setSystemTime(new Date("2026-07-01T00:30:00.000+14:00"));
    db.contract.findMany.mockResolvedValue([
      contractFixture({ endDate: new Date("2026-06-30T00:00:00.000Z") }),
    ]);

    const result = await service.findExpiring({ days: 0 });
    const endDateFilter = db.contract.findMany.mock.calls[0][0].where.endDate;

    expect(endDateFilter.gte.toISOString()).toBe("2026-06-30T00:00:00.000Z");
    expect(endDateFilter.lte.toISOString()).toBe("2026-06-30T23:59:59.999Z");
    expect(result[0].lifecycle).toBe(CONTRACT_LIFECYCLE.Expiring);
  });

  it("uses UTC business-day boundaries for active contract dashboard counts", async () => {
    jest.setSystemTime(new Date("2026-07-01T00:30:00.000+14:00"));
    db.contract.count.mockResolvedValue(1);

    await expect(service.countActive()).resolves.toBe(1);

    expect(
      db.contract.count.mock.calls[0][0].where.endDate.gte.toISOString(),
    ).toBe("2026-06-30T00:00:00.000Z");
  });

  it("derives active, expiring, and expired lifecycle states", () => {
    expect(
      deriveContractLifecycle({
        status: ContractStatus.active,
        endDate: new Date("2026-08-31T00:00:00.000Z"),
      }),
    ).toBe(CONTRACT_LIFECYCLE.Active);
    expect(
      deriveContractLifecycle({
        status: ContractStatus.active,
        endDate: new Date("2026-07-10T00:00:00.000Z"),
      }),
    ).toBe(CONTRACT_LIFECYCLE.Expiring);
    expect(
      deriveContractLifecycle({
        status: ContractStatus.active,
        endDate: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ).toBe(CONTRACT_LIFECYCLE.Expired);
  });

  it("rejects contract writes with invalid chronology", async () => {
    await expect(
      service.create({
        vendorId: "vendor-1",
        contractNumber: "MSA-1",
        title: "Design Platform",
        startDate: "2027-01-01",
        endDate: "2026-01-01",
        value: 1000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.vendor.findUnique).not.toHaveBeenCalled();
  });

  it("persists incoming contract dates as UTC business dates", async () => {
    db.vendor.findUnique.mockResolvedValue({ id: "vendor-1" });
    db.contract.create.mockImplementation(({ data }) =>
      Promise.resolve(contractFixture(data)),
    );

    await service.create({
      vendorId: "vendor-1",
      contractNumber: "MSA-1",
      title: "Design Platform",
      startDate: "2026-07-01T23:30:00.000-05:00",
      endDate: "2026-07-31T00:30:00.000+14:00",
      value: 1000,
    });

    const data = db.contract.create.mock.calls[0][0].data;
    expect(data.startDate.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(data.endDate.toISOString()).toBe("2026-07-31T00:00:00.000Z");
  });

  it("preserves omitted optional status and flags when updating a contract", async () => {
    const existing = contractFixture({
      autoRenew: true,
      renewalNoticeDays: 45,
      status: ContractStatus.expired,
    });
    db.contract.findUnique.mockResolvedValue(existing);
    db.vendor.findUnique.mockResolvedValue({ id: "vendor-1" });
    db.contract.update.mockImplementation(({ data }) =>
      Promise.resolve(contractFixture({ ...existing, ...data })),
    );

    const result = await service.update("contract-1", {
      vendorId: "vendor-1",
      contractNumber: "MSA-2",
      title: "Design Platform Renewal",
      startDate: "2026-07-01",
      endDate: "2027-06-30",
      value: 1500,
    });
    const data = db.contract.update.mock.calls[0][0].data;

    expect(data).toEqual(
      expect.objectContaining({
        autoRenew: true,
        renewalNoticeDays: 45,
        status: ContractStatus.expired,
      }),
    );
    expect(result.autoRenew).toBe(true);
    expect(result.renewalNoticeDays).toBe(45);
    expect(result.status).toBe(ContractStatus.expired);
  });
});
