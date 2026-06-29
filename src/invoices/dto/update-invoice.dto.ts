import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InvoiceStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

/**
 * Request body used to update a procurement invoice.
 *
 * The DTO mirrors invoice creation for required fields on `PUT /invoices/:id`.
 * Optional fields preserve their existing stored values when omitted.
 */
export class UpdateInvoiceDto {
  @ApiProperty({
    description: "Vendor identifier that owns the invoice.",
    example: "abc123def45678",
  })
  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @ApiPropertyOptional({
    description: "Optional contract identifier associated with the invoice.",
    example: "con123def45678",
  })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiProperty({
    description: "Business invoice number.",
    example: "INV-2026-001",
  })
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @ApiProperty({
    description: "Invoice amount in the configured currency.",
    example: 25000,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @ApiProperty({
    description: "Invoice date as an ISO-8601 date string.",
    example: "2026-06-15",
  })
  @IsDateString()
  invoiceDate: string;

  @ApiProperty({
    description: "Invoice due date as an ISO-8601 date string.",
    example: "2026-07-15",
  })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({
    description: "Paid date as an ISO-8601 date string.",
    example: "2026-07-01",
  })
  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @ApiPropertyOptional({
    description: "Stored invoice business status.",
    enum: InvoiceStatus,
    example: InvoiceStatus.issued,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: "Free-form invoice description.",
    example: "Quarterly subscription payment.",
  })
  @IsOptional()
  @IsString()
  description?: string;
}
