import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InvoiceStatus } from "@prisma/client";
import {
  INVOICE_PAYMENT_STATES,
  InvoicePaymentState,
} from "../invoice-payment-state.helpers";

/**
 * Vendor summary embedded in invoice read models.
 */
export class InvoiceVendorSummaryDto {
  @ApiProperty({ description: "Vendor identifier.", example: "abc123def45678" })
  id: string;

  @ApiProperty({
    description: "Vendor display name.",
    example: "Acme Software",
  })
  name: string;
}

/**
 * Contract summary embedded in invoice read models when an invoice is linked
 * to a contract.
 */
export class InvoiceContractSummaryDto {
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
}

/**
 * Invoice response model with stored status and derived payment state.
 */
export class InvoiceResponseDto {
  @ApiProperty({
    description: "Invoice identifier.",
    example: "abc123def45678",
  })
  id: string;

  @ApiProperty({ description: "Vendor identifier.", example: "abc123def45678" })
  vendorId: string;

  @ApiPropertyOptional({
    description: "Linked contract identifier.",
    example: "con123def45678",
  })
  contractId?: string | null;

  @ApiProperty({
    description: "Business invoice number.",
    example: "INV-2026-001",
  })
  invoiceNumber: string;

  @ApiProperty({
    description: "Invoice amount serialized as a number.",
    example: 25000,
  })
  amount: number;

  @ApiProperty({ description: "Invoice date." })
  invoiceDate: Date;

  @ApiProperty({ description: "Invoice due date." })
  dueDate: Date;

  @ApiPropertyOptional({ description: "Invoice paid date." })
  paidDate?: Date | null;

  @ApiProperty({
    description: "Stored invoice business status.",
    enum: InvoiceStatus,
  })
  status: InvoiceStatus;

  @ApiPropertyOptional({ description: "Free-form invoice description." })
  description?: string | null;

  @ApiProperty({
    description:
      "Payment state derived from stored status, due date, and paid date.",
    enum: Object.values(INVOICE_PAYMENT_STATES),
  })
  paymentState: InvoicePaymentState;

  @ApiProperty({ description: "Vendor summary for list and detail views." })
  vendor: InvoiceVendorSummaryDto;

  @ApiPropertyOptional({ description: "Optional contract summary." })
  contract?: InvoiceContractSummaryDto | null;

  @ApiProperty({ description: "Timestamp when the invoice was created." })
  createdAt: Date;

  @ApiProperty({ description: "Timestamp when the invoice was last updated." })
  updatedAt: Date;
}
