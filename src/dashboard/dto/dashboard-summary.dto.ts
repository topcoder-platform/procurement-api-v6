import { ApiProperty } from "@nestjs/swagger";
import { ContractResponseDto } from "../../contracts/dto/contract-response.dto";

/**
 * Summary response returned by the procurement dashboard endpoint.
 */
export class DashboardSummaryDto {
  @ApiProperty({ description: "Total vendor count.", example: 42 })
  vendorCount: number;

  @ApiProperty({
    description: "Count of active, non-expired contracts.",
    example: 18,
  })
  activeContractCount: number;

  @ApiProperty({ description: "Count of pending invoices.", example: 7 })
  pendingInvoiceCount: number;

  @ApiProperty({
    description: "Total value of pending invoices.",
    example: 54000,
  })
  pendingInvoiceTotal: number;

  @ApiProperty({ description: "Count of overdue invoices.", example: 3 })
  overdueInvoiceCount: number;

  @ApiProperty({
    description: "Total value of overdue invoices.",
    example: 12500,
  })
  overdueInvoiceTotal: number;

  @ApiProperty({
    description: "Count of contracts expiring in the default window.",
    example: 5,
  })
  expiringContractCount: number;

  @ApiProperty({
    description: "Preview rows for contracts expiring in the default window.",
    type: [ContractResponseDto],
  })
  expiringContracts: ContractResponseDto[];

  @ApiProperty({
    description: "Count of active, non-final renewal workflows.",
    example: 4,
  })
  activeRenewalCount: number;
}
