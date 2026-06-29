import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContractStatus } from "@prisma/client";
import {
  CONTRACT_LIFECYCLE,
  ContractLifecycle,
} from "../contract-lifecycle.helpers";

/**
 * Vendor summary embedded in contract read models.
 */
export class ContractVendorSummaryDto {
  @ApiProperty({ description: "Vendor identifier.", example: "abc123def45678" })
  id: string;

  @ApiProperty({
    description: "Vendor display name.",
    example: "Acme Software",
  })
  name: string;

  @ApiPropertyOptional({ description: "Vendor category.", example: "Software" })
  category?: string | null;
}

/**
 * Contract response model with stored status and derived lifecycle.
 *
 * The DTO keeps `status` as the persisted enum and exposes `lifecycle` for
 * expiry-aware UI and dashboard behavior.
 */
export class ContractResponseDto {
  @ApiProperty({
    description: "Contract identifier.",
    example: "abc123def45678",
  })
  id: string;

  @ApiProperty({ description: "Vendor identifier.", example: "abc123def45678" })
  vendorId: string;

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

  @ApiPropertyOptional({ description: "Free-form contract description." })
  description?: string | null;

  @ApiProperty({ description: "Contract start date." })
  startDate: Date;

  @ApiProperty({ description: "Contract end date." })
  endDate: Date;

  @ApiProperty({
    description: "Contract value serialized as a number.",
    example: 125000,
  })
  value: number;

  @ApiProperty({
    description: "Whether the contract auto-renews.",
    example: false,
  })
  autoRenew: boolean;

  @ApiPropertyOptional({
    description: "Renewal notice window in days.",
    example: 60,
  })
  renewalNoticeDays?: number | null;

  @ApiProperty({
    description: "Stored contract business status.",
    enum: ContractStatus,
  })
  status: ContractStatus;

  @ApiProperty({
    description: "Lifecycle derived from stored status and end date.",
    enum: Object.values(CONTRACT_LIFECYCLE),
  })
  lifecycle: ContractLifecycle;

  @ApiProperty({ description: "Vendor summary for list and detail views." })
  vendor: ContractVendorSummaryDto;

  @ApiProperty({ description: "Timestamp when the contract was created." })
  createdAt: Date;

  @ApiProperty({ description: "Timestamp when the contract was last updated." })
  updatedAt: Date;
}
