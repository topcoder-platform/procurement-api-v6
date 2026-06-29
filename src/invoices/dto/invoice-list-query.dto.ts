import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import {
  INVOICE_PAYMENT_STATES,
  InvoicePaymentState,
} from "../invoice-payment-state.helpers";

/**
 * Query parameters accepted by the invoice list endpoint.
 *
 * The DTO supports the v1 UI payment-state filter while payment state remains
 * derived from persisted invoice fields.
 */
export class InvoiceListQueryDto {
  @ApiPropertyOptional({
    description: "Optional derived payment-state filter.",
    enum: Object.values(INVOICE_PAYMENT_STATES),
    example: INVOICE_PAYMENT_STATES.Pending,
  })
  @IsOptional()
  @IsIn(Object.values(INVOICE_PAYMENT_STATES))
  state?: InvoicePaymentState;
}
