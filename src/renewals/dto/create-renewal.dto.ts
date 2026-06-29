import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

/**
 * Request body used to create a renewal workflow.
 *
 * The DTO excludes stage and stage timestamps because new renewals always
 * start at quotation and workflow movement is handled by the stage endpoint.
 */
export class CreateRenewalDto {
  @ApiProperty({
    description: "Contract identifier being renewed.",
    example: "con123def45678",
  })
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty({
    description: "Renewal term length in months.",
    example: 12,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  renewalTermMonths: number;

  @ApiProperty({
    description:
      "New contract start date as ISO-8601 input. The submitted calendar day is stored at midnight UTC.",
    example: "2027-07-01",
  })
  @IsDateString()
  newStartDate: string;

  @ApiProperty({
    description:
      "New contract end date as ISO-8601 input. The submitted calendar day is stored at midnight UTC.",
    example: "2028-06-30",
  })
  @IsDateString()
  newEndDate: string;

  @ApiPropertyOptional({
    description: "Optional new contract value in the configured currency.",
    example: 135000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  newValue?: number;

  @ApiPropertyOptional({
    description: "Current renewal assignee.",
    example: "procurement@example.com",
  })
  @IsOptional()
  @IsString()
  assignee?: string;

  @ApiPropertyOptional({
    description: "Free-form renewal notes.",
    example: "Waiting on vendor quotation.",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
