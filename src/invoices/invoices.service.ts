import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InvoiceStatus, Prisma } from "@prisma/client";
import { serializeMoney } from "../common/money.util";
import { DbService } from "../db/db.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { InvoiceListQueryDto } from "./dto/invoice-list-query.dto";
import { InvoiceResponseDto } from "./dto/invoice-response.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import {
  INVOICE_PAYMENT_STATES,
  InvoicePaymentState,
  deriveInvoicePaymentState,
  normalizeToStartOfDay,
  parseBusinessDate,
} from "./invoice-payment-state.helpers";

const invoiceInclude = {
  vendor: {
    select: {
      id: true,
      name: true,
    },
  },
  contract: {
    select: {
      id: true,
      contractNumber: true,
      title: true,
      vendorId: true,
    },
  },
} satisfies Prisma.InvoiceInclude;

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: typeof invoiceInclude;
}>;

type InvoiceMutationDto = CreateInvoiceDto | UpdateInvoiceDto;

export type InvoiceDashboardBuckets = {
  pending: {
    count: number;
    total: number;
  };
  overdue: {
    count: number;
    total: number;
  };
};

/**
 * Service implementing invoice CRUD and derived payment-state behavior.
 *
 * The service keeps the stored invoice status enum unchanged and derives
 * pending/overdue values consistently for list, alert, and dashboard surfaces.
 */
@Injectable()
export class InvoicesService {
  /**
   * Creates an invoice service backed by the shared Prisma database service.
   *
   * @param db Prisma-backed database service for procurement data.
   */
  constructor(private readonly db: DbService) {}

  /**
   * Lists invoices and optionally filters by derived payment state.
   *
   * @param query Optional list query containing a derived payment-state filter.
   * @returns Invoice response models with vendor and contract summaries.
   */
  async findAll(
    query: InvoiceListQueryDto = {},
  ): Promise<InvoiceResponseDto[]> {
    const invoices = await this.db.invoice.findMany({
      include: invoiceInclude,
      orderBy: { dueDate: "asc" },
    });
    const responses = invoices.map((invoice) => this.toResponse(invoice));

    return query.state
      ? responses.filter((invoice) => invoice.paymentState === query.state)
      : responses;
  }

  /**
   * Lists overdue invoices.
   *
   * @returns Overdue invoice response models sorted by due date.
   */
  async findOverdue(): Promise<InvoiceResponseDto[]> {
    const invoices = await this.db.invoice.findMany({
      where: {
        status: {
          notIn: [
            InvoiceStatus.draft,
            InvoiceStatus.paid,
            InvoiceStatus.cancelled,
          ],
        },
        dueDate: { lt: normalizeToStartOfDay() },
      },
      include: invoiceInclude,
      orderBy: { dueDate: "asc" },
    });

    return invoices
      .map((invoice) => this.toResponse(invoice))
      .filter(
        (invoice) => invoice.paymentState === INVOICE_PAYMENT_STATES.Overdue,
      );
  }

  /**
   * Finds one invoice by identifier.
   *
   * @param id Invoice identifier to load.
   * @returns Invoice response model with derived payment state.
   * @throws NotFoundException when no invoice exists for the identifier.
   */
  async findOne(id: string): Promise<InvoiceResponseDto> {
    return this.toResponse(await this.findInvoiceOrThrow(id));
  }

  /**
   * Creates an invoice after validating vendor and optional contract links.
   *
   * @param dto Validated invoice creation payload.
   * @returns Created invoice response model.
   * @throws BadRequestException when vendor or contract references are invalid.
   */
  async create(dto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    await this.assertVendorExists(dto.vendorId);
    await this.assertContractBelongsToVendor(dto.contractId, dto.vendorId);

    const invoice = await this.db.invoice.create({
      data: this.toMutationData(dto),
      include: invoiceInclude,
    });

    return this.toResponse(invoice);
  }

  /**
   * Updates editable invoice fields while preserving omitted optional values.
   *
   * @param id Invoice identifier to update.
   * @param dto Validated update payload.
   * @returns Updated invoice response model.
   * @throws NotFoundException when no invoice exists for the identifier.
   * @throws BadRequestException when vendor or contract references are invalid.
   */
  async update(id: string, dto: UpdateInvoiceDto): Promise<InvoiceResponseDto> {
    const existing = await this.findInvoiceOrThrow(id);
    const contractId =
      dto.contractId === undefined
        ? (existing.contractId ?? undefined)
        : (dto.contractId ?? undefined);

    await this.assertVendorExists(dto.vendorId);
    await this.assertContractBelongsToVendor(contractId, dto.vendorId);

    const invoice = await this.db.invoice.update({
      where: { id },
      data: this.toMutationData(dto, existing),
      include: invoiceInclude,
    });

    return this.toResponse(invoice);
  }

  /**
   * Hard-deletes an invoice.
   *
   * @param id Invoice identifier to delete.
   * @returns Deleted invoice response model.
   * @throws NotFoundException when no invoice exists for the identifier.
   */
  async remove(id: string): Promise<InvoiceResponseDto> {
    await this.findInvoiceOrThrow(id);

    const invoice = await this.db.invoice.delete({
      where: { id },
      include: invoiceInclude,
    });

    return this.toResponse(invoice);
  }

  /**
   * Summarizes pending and overdue invoices for the dashboard.
   *
   * @returns Counts and money totals for derived pending and overdue states.
   */
  async getDashboardBuckets(): Promise<InvoiceDashboardBuckets> {
    const invoices = await this.db.invoice.findMany({
      where: {
        status: {
          notIn: [
            InvoiceStatus.draft,
            InvoiceStatus.paid,
            InvoiceStatus.cancelled,
          ],
        },
      },
      include: invoiceInclude,
    });

    return invoices.reduce<InvoiceDashboardBuckets>(
      (buckets, invoice) => {
        const state = deriveInvoicePaymentState(invoice);
        this.addInvoiceToBucket(buckets, state, serializeMoney(invoice.amount));
        return buckets;
      },
      {
        pending: { count: 0, total: 0 },
        overdue: { count: 0, total: 0 },
      },
    );
  }

  /**
   * Loads an invoice with relation summaries or throws a not-found exception.
   *
   * @param id Invoice identifier to load.
   * @returns Prisma invoice record with vendor and optional contract summary.
   * @throws NotFoundException when no invoice exists for the identifier.
   */
  private async findInvoiceOrThrow(id: string): Promise<InvoiceWithRelations> {
    const invoice = await this.db.invoice.findUnique({
      where: { id },
      include: invoiceInclude,
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice "${id}" was not found.`);
    }

    return invoice;
  }

  /**
   * Verifies that a referenced vendor exists.
   *
   * @param vendorId Vendor identifier referenced by an invoice mutation.
   * @returns A promise that resolves when the vendor exists.
   * @throws BadRequestException when the vendor identifier is missing.
   */
  private async assertVendorExists(vendorId: string): Promise<void> {
    const vendor = await this.db.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      throw new BadRequestException(`Vendor "${vendorId}" was not found.`);
    }
  }

  /**
   * Validates that an optional contract exists and belongs to the supplied
   * vendor, preventing invoices from drifting across vendors.
   *
   * @param contractId Optional contract identifier from the invoice payload.
   * @param vendorId Vendor identifier from the invoice payload.
   * @returns A promise that resolves when the link is valid.
   * @throws BadRequestException when the contract is missing or mismatched.
   */
  private async assertContractBelongsToVendor(
    contractId: string | undefined,
    vendorId: string,
  ): Promise<void> {
    if (!contractId) {
      return;
    }

    const contract = await this.db.contract.findUnique({
      where: { id: contractId },
      select: { id: true, vendorId: true },
    });

    if (!contract) {
      throw new BadRequestException(`Contract "${contractId}" was not found.`);
    }

    if (contract.vendorId !== vendorId) {
      throw new BadRequestException(
        `Contract "${contractId}" does not belong to vendor "${vendorId}".`,
      );
    }
  }

  /**
   * Converts a validated mutation DTO into Prisma invoice data.
   *
   * @param dto Invoice creation or update payload.
   * @param existing Existing invoice used to preserve omitted update fields.
   * @returns Prisma-compatible invoice mutation data.
   */
  private toMutationData(
    dto: InvoiceMutationDto,
    existing?: InvoiceWithRelations,
  ): Prisma.InvoiceUncheckedCreateInput {
    return {
      vendorId: dto.vendorId,
      contractId:
        dto.contractId === undefined
          ? (existing?.contractId ?? null)
          : dto.contractId,
      invoiceNumber: dto.invoiceNumber,
      amount: dto.amount,
      invoiceDate: parseBusinessDate(dto.invoiceDate),
      dueDate: parseBusinessDate(dto.dueDate),
      paidDate:
        dto.paidDate === undefined
          ? (existing?.paidDate ?? null)
          : dto.paidDate
            ? parseBusinessDate(dto.paidDate)
            : null,
      status:
        dto.status === undefined
          ? (existing?.status ?? InvoiceStatus.issued)
          : dto.status,
      description:
        dto.description === undefined
          ? (existing?.description ?? null)
          : dto.description,
    };
  }

  /**
   * Adds an invoice amount to the matching dashboard bucket.
   *
   * @param buckets Mutable dashboard buckets accumulator.
   * @param state Derived payment state for the invoice.
   * @param amount Serialized invoice amount.
   * @returns Nothing; the accumulator is updated in place.
   */
  private addInvoiceToBucket(
    buckets: InvoiceDashboardBuckets,
    state: InvoicePaymentState,
    amount: number,
  ): void {
    if (state === INVOICE_PAYMENT_STATES.Pending) {
      buckets.pending.count += 1;
      buckets.pending.total += amount;
    }

    if (state === INVOICE_PAYMENT_STATES.Overdue) {
      buckets.overdue.count += 1;
      buckets.overdue.total += amount;
    }
  }

  /**
   * Converts a Prisma invoice record into the stable API response shape.
   *
   * @param invoice Invoice record with vendor and optional contract summary.
   * @returns Invoice response model with derived payment state.
   */
  private toResponse(invoice: InvoiceWithRelations): InvoiceResponseDto {
    return {
      id: invoice.id,
      vendorId: invoice.vendorId,
      contractId: invoice.contractId,
      invoiceNumber: invoice.invoiceNumber,
      amount: serializeMoney(invoice.amount),
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      status: invoice.status,
      description: invoice.description,
      paymentState: deriveInvoicePaymentState(invoice),
      vendor: {
        id: invoice.vendor.id,
        name: invoice.vendor.name,
      },
      contract: invoice.contract
        ? {
            id: invoice.contract.id,
            contractNumber: invoice.contract.contractNumber,
            title: invoice.contract.title,
          }
        : null,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }
}
