import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContractStatus, Prisma, RenewalStage } from "@prisma/client";
import { parseBusinessDate } from "../common/business-date.util";
import { serializeOptionalMoney } from "../common/money.util";
import { DbService } from "../db/db.service";
import { CreateRenewalDto } from "./dto/create-renewal.dto";
import { RenewalResponseDto } from "./dto/renewal-response.dto";
import { RenewalStageDto } from "./dto/renewal-stage.dto";
import { UpdateRenewalDto } from "./dto/update-renewal.dto";
import {
  RENEWAL_STAGE_DEFINITIONS,
  TERMINAL_RENEWAL_STAGE,
  getRenewalStageDefinition,
  isAdjacentRenewalStageMove,
  isForwardRenewalStageMove,
} from "./renewal-stage.constants";

const renewalInclude = {
  contract: {
    select: {
      id: true,
      contractNumber: true,
      title: true,
      status: true,
      vendor: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.RenewalInclude;

type RenewalWithContract = Prisma.RenewalGetPayload<{
  include: typeof renewalInclude;
}>;

type RenewalMutationDto = CreateRenewalDto | UpdateRenewalDto;

/**
 * Service implementing renewal CRUD and adjacent-stage workflow transitions.
 *
 * Normal updates never mutate workflow fields. Stage movement is centralized in
 * `transitionStage`, with PO release finalization handled in one transaction.
 */
@Injectable()
export class RenewalsService {
  /**
   * Creates a renewal service backed by the shared Prisma database service.
   *
   * @param db Prisma-backed database service for procurement data.
   */
  constructor(private readonly db: DbService) {}

  /**
   * Lists available renewal workflow stages in display order.
   *
   * @returns Stage metadata used by clients and tests.
   */
  listStages(): RenewalStageDto[] {
    return RENEWAL_STAGE_DEFINITIONS.map((definition) => ({
      stage: definition.stage,
      label: definition.label,
      order: definition.order,
      terminal: definition.stage === TERMINAL_RENEWAL_STAGE,
    }));
  }

  /**
   * Lists all renewal workflows with contract and vendor context.
   *
   * @returns Renewal response models sorted by new end date.
   */
  async findAll(): Promise<RenewalResponseDto[]> {
    const renewals = await this.db.renewal.findMany({
      include: renewalInclude,
      orderBy: { newEndDate: "asc" },
    });

    return renewals.map((renewal) => this.toResponse(renewal));
  }

  /**
   * Finds one renewal by identifier.
   *
   * @param id Renewal identifier to load.
   * @returns Renewal response model with stage metadata.
   * @throws NotFoundException when no renewal exists for the identifier.
   */
  async findOne(id: string): Promise<RenewalResponseDto> {
    return this.toResponse(await this.findRenewalOrThrow(id));
  }

  /**
   * Creates a renewal at the quotation stage and stamps quotationAt.
   *
   * @param dto Validated renewal creation payload.
   * @returns Created renewal response model.
   * @throws BadRequestException when dates are invalid or contract is missing.
   */
  async create(dto: CreateRenewalDto): Promise<RenewalResponseDto> {
    this.assertChronology(dto.newStartDate, dto.newEndDate);
    await this.assertContractExists(dto.contractId);

    const renewal = await this.db.renewal.create({
      data: {
        ...this.toMutationData(dto),
        stage: RenewalStage.quotation,
        quotationAt: new Date(),
      },
      include: renewalInclude,
    });

    return this.toResponse(renewal);
  }

  /**
   * Replaces editable renewal details without changing workflow fields.
   *
   * @param id Renewal identifier to replace.
   * @param dto Validated replacement payload.
   * @returns Updated renewal response model.
   * @throws NotFoundException when no renewal exists for the identifier.
   * @throws BadRequestException when dates are invalid or contract is missing.
   */
  async update(id: string, dto: UpdateRenewalDto): Promise<RenewalResponseDto> {
    await this.findRenewalOrThrow(id);
    this.assertChronology(dto.newStartDate, dto.newEndDate);
    await this.assertContractExists(dto.contractId);

    const renewal = await this.db.renewal.update({
      where: { id },
      data: this.toMutationData(dto),
      include: renewalInclude,
    });

    return this.toResponse(renewal);
  }

  /**
   * Hard-deletes a renewal workflow.
   *
   * @param id Renewal identifier to delete.
   * @returns Deleted renewal response model.
   * @throws NotFoundException when no renewal exists for the identifier.
   */
  async remove(id: string): Promise<RenewalResponseDto> {
    await this.findRenewalOrThrow(id);

    const renewal = await this.db.renewal.delete({
      where: { id },
      include: renewalInclude,
    });

    return this.toResponse(renewal);
  }

  /**
   * Moves a renewal exactly one stage forward or backward.
   * PO release finalizes contract dates, optional value, and expired status.
   *
   * @param id Renewal identifier to transition.
   * @param targetStage Requested adjacent target stage.
   * @returns Updated renewal response model.
   * @throws NotFoundException when no renewal exists for the identifier.
   * @throws BadRequestException when the transition violates workflow rules.
   */
  async transitionStage(
    id: string,
    targetStage: RenewalStage,
  ): Promise<RenewalResponseDto> {
    const renewal = await this.findRenewalOrThrow(id);
    const currentStage = renewal.stage;

    if (currentStage === TERMINAL_RENEWAL_STAGE) {
      throw new BadRequestException("PO release is terminal and cannot move.");
    }

    const targetDefinition = getRenewalStageDefinition(targetStage);
    if (!targetDefinition) {
      throw new BadRequestException(
        `Renewal stage "${targetStage}" is not supported.`,
      );
    }

    if (!isAdjacentRenewalStageMove(currentStage, targetStage)) {
      throw new BadRequestException(
        "Renewal stage transitions must move exactly one step.",
      );
    }

    const isForward = isForwardRenewalStageMove(currentStage, targetStage);
    const timestampData = isForward
      ? { [targetDefinition.timestampField]: new Date() }
      : {};

    if (targetStage === TERMINAL_RENEWAL_STAGE) {
      const finalized = await this.db.$transaction(async (tx) => {
        const updatedRenewal = await tx.renewal.update({
          where: { id },
          data: {
            stage: targetStage,
            ...timestampData,
          },
          include: renewalInclude,
        });
        await tx.contract.update({
          where: { id: renewal.contractId },
          data: {
            startDate: renewal.newStartDate,
            endDate: renewal.newEndDate,
            ...(renewal.newValue == null ? {} : { value: renewal.newValue }),
            ...(renewal.contract.status === ContractStatus.expired
              ? { status: ContractStatus.active }
              : {}),
          },
        });

        return updatedRenewal;
      });

      return this.toResponse(finalized);
    }

    const updated = await this.db.renewal.update({
      where: { id },
      data: {
        stage: targetStage,
        ...timestampData,
      },
      include: renewalInclude,
    });

    return this.toResponse(updated);
  }

  /**
   * Counts active, non-final renewal workflows for dashboard summaries.
   *
   * @returns Number of renewals that have not reached PO release.
   */
  countActive(): Promise<number> {
    return this.db.renewal.count({
      where: {
        stage: { not: TERMINAL_RENEWAL_STAGE },
      },
    });
  }

  /**
   * Loads a renewal with contract and vendor context or throws not found.
   *
   * @param id Renewal identifier to load.
   * @returns Prisma renewal record with contract and vendor context.
   * @throws NotFoundException when no renewal exists for the identifier.
   */
  private async findRenewalOrThrow(id: string): Promise<RenewalWithContract> {
    const renewal = await this.db.renewal.findUnique({
      where: { id },
      include: renewalInclude,
    });

    if (!renewal) {
      throw new NotFoundException(`Renewal "${id}" was not found.`);
    }

    return renewal;
  }

  /**
   * Verifies that a referenced contract exists.
   *
   * @param contractId Contract identifier referenced by a renewal mutation.
   * @returns A promise that resolves when the contract exists.
   * @throws BadRequestException when the contract identifier is missing.
   */
  private async assertContractExists(contractId: string): Promise<void> {
    const contract = await this.db.contract.findUnique({
      where: { id: contractId },
      select: { id: true },
    });

    if (!contract) {
      throw new BadRequestException(`Contract "${contractId}" was not found.`);
    }
  }

  /**
   * Verifies that the renewal business start date does not come after the end date.
   *
   * @param startDate New contract start date from the request.
   * @param endDate New contract end date from the request.
   * @returns Nothing when chronology is valid.
   * @throws BadRequestException when either date is invalid or start date is after end date.
   */
  private assertChronology(startDate: string, endDate: string): void {
    const parsedStartDate = this.parseRenewalBusinessDate(
      "newStartDate",
      startDate,
    );
    const parsedEndDate = this.parseRenewalBusinessDate("newEndDate", endDate);

    if (parsedStartDate > parsedEndDate) {
      throw new BadRequestException(
        "Renewal newStartDate must be on or before newEndDate.",
      );
    }
  }

  /**
   * Parses a renewal business date for service-level mutation validation.
   *
   * @param fieldName Renewal DTO field being parsed for error reporting.
   * @param value ISO-8601 business date string supplied by the request.
   * @returns Parsed date normalized to midnight UTC for the submitted calendar day.
   * @throws BadRequestException when the date is not a valid calendar date.
   */
  private parseRenewalBusinessDate(
    fieldName: "newStartDate" | "newEndDate",
    value: string,
  ): Date {
    try {
      return parseBusinessDate(value);
    } catch (error) {
      if (error instanceof RangeError) {
        throw new BadRequestException(
          `Renewal ${fieldName} must be a valid calendar date.`,
        );
      }

      throw error;
    }
  }

  /**
   * Converts a validated mutation DTO into Prisma renewal data.
   *
   * @param dto Renewal creation or replacement payload.
   * @returns Prisma-compatible data with business dates normalized to midnight UTC.
   * @throws BadRequestException when a mutation date is not a valid calendar date.
   */
  private toMutationData(
    dto: RenewalMutationDto,
  ): Prisma.RenewalUncheckedCreateInput {
    return {
      contractId: dto.contractId,
      renewalTermMonths: dto.renewalTermMonths,
      newStartDate: this.parseRenewalBusinessDate(
        "newStartDate",
        dto.newStartDate,
      ),
      newEndDate: this.parseRenewalBusinessDate("newEndDate", dto.newEndDate),
      newValue: dto.newValue ?? null,
      assignee: dto.assignee ?? null,
      notes: dto.notes ?? null,
    };
  }

  /**
   * Converts a Prisma renewal record into the stable API response shape.
   *
   * @param renewal Renewal record with contract and vendor context.
   * @returns Renewal response model with stage label and order metadata.
   */
  private toResponse(renewal: RenewalWithContract): RenewalResponseDto {
    const stageDefinition = getRenewalStageDefinition(renewal.stage);

    if (!stageDefinition) {
      throw new BadRequestException(
        `Renewal stage "${renewal.stage}" is not supported.`,
      );
    }

    return {
      id: renewal.id,
      contractId: renewal.contractId,
      renewalTermMonths: renewal.renewalTermMonths,
      newStartDate: renewal.newStartDate,
      newEndDate: renewal.newEndDate,
      newValue: serializeOptionalMoney(renewal.newValue),
      stage: renewal.stage,
      stageLabel: stageDefinition.label,
      stageOrder: stageDefinition.order,
      assignee: renewal.assignee,
      notes: renewal.notes,
      quotationAt: renewal.quotationAt,
      vraAt: renewal.vraAt,
      cioApprovalAt: renewal.cioApprovalAt,
      legalReviewAt: renewal.legalReviewAt,
      orderFormSignedAt: renewal.orderFormSignedAt,
      prCreationAt: renewal.prCreationAt,
      prApprovalsAt: renewal.prApprovalsAt,
      poReleaseAt: renewal.poReleaseAt,
      contract: {
        id: renewal.contract.id,
        contractNumber: renewal.contract.contractNumber,
        title: renewal.contract.title,
        vendor: {
          id: renewal.contract.vendor.id,
          name: renewal.contract.vendor.name,
        },
      },
      createdAt: renewal.createdAt,
      updatedAt: renewal.updatedAt,
    };
  }
}
