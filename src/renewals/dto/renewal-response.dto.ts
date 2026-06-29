import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RenewalStage } from "@prisma/client";

/**
 * Vendor summary embedded in renewal read models through the related contract.
 */
export class RenewalVendorSummaryDto {
  @ApiProperty({ description: "Vendor identifier.", example: "abc123def45678" })
  id: string;

  @ApiProperty({
    description: "Vendor display name.",
    example: "Acme Software",
  })
  name: string;
}

/**
 * Contract summary embedded in renewal read models.
 */
export class RenewalContractSummaryDto {
  @ApiProperty({
    description: "Contract identifier.",
    example: "con123def45678",
  })
  id: string;

  @ApiProperty({
    description: "Business contract number.",
    example: "MSA-2026-001",
  })
  contractNumber: string;

  @ApiProperty({
    description: "Contract title.",
    example: "Design Platform Subscription",
  })
  title: string;

  @ApiProperty({ description: "Vendor summary for the contract." })
  vendor: RenewalVendorSummaryDto;
}

/**
 * Renewal response model with workflow metadata and contract/vendor context.
 */
export class RenewalResponseDto {
  @ApiProperty({
    description: "Renewal identifier.",
    example: "ren123def45678",
  })
  id: string;

  @ApiProperty({
    description: "Contract identifier being renewed.",
    example: "con123def45678",
  })
  contractId: string;

  @ApiProperty({ description: "Renewal term length in months.", example: 12 })
  renewalTermMonths: number;

  @ApiProperty({
    description: "Normalized new contract start business date.",
  })
  newStartDate: Date;

  @ApiProperty({
    description: "Normalized new contract end business date.",
  })
  newEndDate: Date;

  @ApiPropertyOptional({
    description: "Optional new contract value serialized as a number.",
  })
  newValue?: number | null;

  @ApiProperty({ description: "Current workflow stage.", enum: RenewalStage })
  stage: RenewalStage;

  @ApiProperty({ description: "Human-readable label for the current stage." })
  stageLabel: string;

  @ApiProperty({ description: "One-based order for the current stage." })
  stageOrder: number;

  @ApiPropertyOptional({ description: "Current renewal assignee." })
  assignee?: string | null;

  @ApiPropertyOptional({ description: "Free-form renewal notes." })
  notes?: string | null;

  @ApiPropertyOptional({
    description: "Timestamp when quotation stage was reached.",
  })
  quotationAt?: Date | null;

  @ApiPropertyOptional({ description: "Timestamp when VRA stage was reached." })
  vraAt?: Date | null;

  @ApiPropertyOptional({
    description: "Timestamp when CIO approval stage was reached.",
  })
  cioApprovalAt?: Date | null;

  @ApiPropertyOptional({
    description: "Timestamp when legal review stage was reached.",
  })
  legalReviewAt?: Date | null;

  @ApiPropertyOptional({
    description: "Timestamp when order form signed stage was reached.",
  })
  orderFormSignedAt?: Date | null;

  @ApiPropertyOptional({
    description: "Timestamp when PR creation stage was reached.",
  })
  prCreationAt?: Date | null;

  @ApiPropertyOptional({
    description: "Timestamp when PR approvals stage was reached.",
  })
  prApprovalsAt?: Date | null;

  @ApiPropertyOptional({
    description: "Timestamp when PO release stage was reached.",
  })
  poReleaseAt?: Date | null;

  @ApiProperty({ description: "Related contract and vendor context." })
  contract: RenewalContractSummaryDto;

  @ApiProperty({ description: "Timestamp when the renewal was created." })
  createdAt: Date;

  @ApiProperty({ description: "Timestamp when the renewal was last updated." })
  updatedAt: Date;
}
