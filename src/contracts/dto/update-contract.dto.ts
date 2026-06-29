import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContractStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

/**
 * Request body used to update a procurement contract.
 *
 * The DTO mirrors contract creation for required fields on `PUT /contracts/:id`.
 * Optional fields preserve their existing stored values when omitted.
 */
export class UpdateContractDto {
  @ApiProperty({
    description: "Vendor identifier that owns the contract.",
    example: "abc123def45678",
  })
  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @ApiProperty({
    description: "Business contract number.",
    example: "MSA-2026-001",
  })
  @IsString()
  @IsNotEmpty()
  contractNumber: string;

  @ApiProperty({
    description: "Contract title shown in procurement lists.",
    example: "Design Platform Subscription",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: "Free-form contract description.",
    example: "Annual license renewal for design collaboration tooling.",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Contract start date as an ISO-8601 date string.",
    example: "2026-07-01",
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: "Contract end date as an ISO-8601 date string.",
    example: "2027-06-30",
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: "Contract value in the configured currency.",
    example: 125000,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;

  @ApiPropertyOptional({
    description: "Whether the contract auto-renews.",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({
    description: "Number of days before end date to notify for renewal.",
    example: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  renewalNoticeDays?: number;

  @ApiPropertyOptional({
    description: "Stored contract business status.",
    enum: ContractStatus,
    example: ContractStatus.active,
  })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}
