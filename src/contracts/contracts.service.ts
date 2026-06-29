import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContractStatus, Prisma } from "@prisma/client";
import { serializeMoney } from "../common/money.util";
import { DbService } from "../db/db.service";
import {
  DEFAULT_EXPIRING_CONTRACT_DAYS,
  deriveContractLifecycle,
  getExpiringContractCutoff,
  normalizeToStartOfDay,
  parseBusinessDate,
} from "./contract-lifecycle.helpers";
import { ContractResponseDto } from "./dto/contract-response.dto";
import { CreateContractDto } from "./dto/create-contract.dto";
import { ExpiringContractsQueryDto } from "./dto/expiring-contracts-query.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";

const contractInclude = {
  vendor: {
    select: {
      id: true,
      name: true,
      category: true,
    },
  },
} satisfies Prisma.ContractInclude;

type ContractWithVendor = Prisma.ContractGetPayload<{
  include: typeof contractInclude;
}>;

type ContractMutationDto = CreateContractDto | UpdateContractDto;

/**
 * Service implementing contract CRUD and derived expiry behavior.
 *
 * Contract status remains the stored enum, while lifecycle is derived from the
 * stored status and end date for lists, details, alerts, and dashboard counts.
 */
@Injectable()
export class ContractsService {
  /**
   * Creates a contract service backed by the shared Prisma database service.
   *
   * @param db Prisma-backed database service for procurement data.
   */
  constructor(private readonly db: DbService) {}

  /**
   * Lists all contracts with vendor summaries.
   *
   * @returns Contract response models with derived lifecycle fields.
   */
  async findAll(): Promise<ContractResponseDto[]> {
    const contracts = await this.db.contract.findMany({
      include: contractInclude,
      orderBy: { endDate: "asc" },
    });

    return contracts.map((contract) => this.toResponse(contract));
  }

  /**
   * Finds one contract by identifier.
   *
   * @param id Contract identifier to load.
   * @returns Contract response model with derived lifecycle field.
   * @throws NotFoundException when no contract exists for the identifier.
   */
  async findOne(id: string): Promise<ContractResponseDto> {
    return this.toResponse(await this.findContractOrThrow(id));
  }

  /**
   * Lists contracts expiring in the requested alert window.
   *
   * @param query Optional query DTO containing a positive day window.
   * @returns Expiring contract response models sorted by nearest end date.
   */
  async findExpiring(
    query: ExpiringContractsQueryDto = {},
  ): Promise<ContractResponseDto[]> {
    const days = query.days ?? DEFAULT_EXPIRING_CONTRACT_DAYS;
    const contracts = await this.db.contract.findMany({
      where: {
        status: ContractStatus.active,
        endDate: {
          gte: normalizeToStartOfDay(),
          lte: getExpiringContractCutoff(days),
        },
      },
      include: contractInclude,
      orderBy: { endDate: "asc" },
    });

    return contracts.map((contract) => this.toResponse(contract, days));
  }

  /**
   * Creates a contract after validating vendor existence and chronology.
   *
   * @param dto Validated contract creation payload.
   * @returns Created contract response model.
   * @throws BadRequestException when dates are invalid or vendor is missing.
   */
  async create(dto: CreateContractDto): Promise<ContractResponseDto> {
    this.assertChronology(dto.startDate, dto.endDate);
    await this.assertVendorExists(dto.vendorId);

    const contract = await this.db.contract.create({
      data: this.toMutationData(dto),
      include: contractInclude,
    });

    return this.toResponse(contract);
  }

  /**
   * Updates editable contract fields while preserving omitted optional values.
   *
   * @param id Contract identifier to update.
   * @param dto Validated update payload.
   * @returns Updated contract response model.
   * @throws NotFoundException when no contract exists for the identifier.
   * @throws BadRequestException when dates are invalid or vendor is missing.
   */
  async update(
    id: string,
    dto: UpdateContractDto,
  ): Promise<ContractResponseDto> {
    const existing = await this.findContractOrThrow(id);
    this.assertChronology(dto.startDate, dto.endDate);
    await this.assertVendorExists(dto.vendorId);

    const contract = await this.db.contract.update({
      where: { id },
      data: this.toMutationData(dto, existing),
      include: contractInclude,
    });

    return this.toResponse(contract);
  }

  /**
   * Hard-deletes a contract.
   *
   * @param id Contract identifier to delete.
   * @returns Deleted contract response model.
   * @throws NotFoundException when no contract exists for the identifier.
   * @throws ConflictException when invoices or renewals still reference it.
   */
  async remove(id: string): Promise<ContractResponseDto> {
    await this.findContractOrThrow(id);

    try {
      const contract = await this.db.contract.delete({
        where: { id },
        include: contractInclude,
      });
      return this.toResponse(contract);
    } catch (error) {
      if (this.isPrismaErrorCode(error, "P2003")) {
        throw new ConflictException(
          `Contract "${id}" cannot be deleted while invoices or renewals reference it.`,
        );
      }

      throw error;
    }
  }

  /**
   * Counts active, non-expired contracts for dashboard summaries.
   *
   * @returns Number of active contracts whose end date has not passed.
   */
  async countActive(): Promise<number> {
    return this.db.contract.count({
      where: {
        status: ContractStatus.active,
        endDate: { gte: normalizeToStartOfDay() },
      },
    });
  }

  /**
   * Loads a contract with vendor summary or throws a not-found exception.
   *
   * @param id Contract identifier to load.
   * @returns Prisma contract record with vendor summary.
   * @throws NotFoundException when no contract exists for the identifier.
   */
  private async findContractOrThrow(id: string): Promise<ContractWithVendor> {
    const contract = await this.db.contract.findUnique({
      where: { id },
      include: contractInclude,
    });

    if (!contract) {
      throw new NotFoundException(`Contract "${id}" was not found.`);
    }

    return contract;
  }

  /**
   * Verifies that a referenced vendor exists.
   *
   * @param vendorId Vendor identifier referenced by a contract mutation.
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
   * Verifies that start date does not come after end date.
   *
   * @param startDate Contract start date from the request.
   * @param endDate Contract end date from the request.
   * @returns Nothing when chronology is valid.
   * @throws BadRequestException when start date is after end date.
   */
  private assertChronology(startDate: string, endDate: string): void {
    if (parseBusinessDate(startDate) > parseBusinessDate(endDate)) {
      throw new BadRequestException(
        "Contract startDate must be on or before endDate.",
      );
    }
  }

  /**
   * Converts a validated mutation DTO into Prisma contract data.
   *
   * @param dto Contract creation or update payload.
   * @param existing Existing contract used to preserve omitted update fields.
   * @returns Prisma-compatible contract mutation data.
   */
  private toMutationData(
    dto: ContractMutationDto,
    existing?: ContractWithVendor,
  ): Prisma.ContractUncheckedCreateInput {
    return {
      vendorId: dto.vendorId,
      contractNumber: dto.contractNumber,
      title: dto.title,
      description:
        dto.description === undefined
          ? (existing?.description ?? null)
          : dto.description,
      startDate: parseBusinessDate(dto.startDate),
      endDate: parseBusinessDate(dto.endDate),
      value: dto.value,
      autoRenew:
        dto.autoRenew === undefined
          ? (existing?.autoRenew ?? false)
          : dto.autoRenew,
      renewalNoticeDays:
        dto.renewalNoticeDays === undefined
          ? (existing?.renewalNoticeDays ?? null)
          : dto.renewalNoticeDays,
      status:
        dto.status === undefined
          ? (existing?.status ?? ContractStatus.active)
          : dto.status,
    };
  }

  /**
   * Converts a Prisma contract record into the stable API response shape.
   *
   * @param contract Contract record with vendor summary returned by Prisma.
   * @param lifecycleDays Expiring window used for lifecycle derivation.
   * @returns Contract response model.
   */
  private toResponse(
    contract: ContractWithVendor,
    lifecycleDays: number = DEFAULT_EXPIRING_CONTRACT_DAYS,
  ): ContractResponseDto {
    return {
      id: contract.id,
      vendorId: contract.vendorId,
      contractNumber: contract.contractNumber,
      title: contract.title,
      description: contract.description,
      startDate: contract.startDate,
      endDate: contract.endDate,
      value: serializeMoney(contract.value),
      autoRenew: contract.autoRenew,
      renewalNoticeDays: contract.renewalNoticeDays,
      status: contract.status,
      lifecycle: deriveContractLifecycle(contract, lifecycleDays),
      vendor: {
        id: contract.vendor.id,
        name: contract.vendor.name,
        category: contract.vendor.category,
      },
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    };
  }

  /**
   * Checks whether an unknown error is a Prisma error with a specific code.
   *
   * @param error Unknown error thrown by Prisma.
   * @param code Prisma error code to match.
   * @returns `true` when the error carries the requested Prisma code.
   */
  private isPrismaErrorCode(error: unknown, code: string): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === code
    );
  }
}
