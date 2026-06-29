import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";
import { DEFAULT_EXPIRING_CONTRACT_DAYS } from "../contract-lifecycle.helpers";

/**
 * Query parameters accepted by the expiring contracts endpoint.
 *
 * The DTO validates the alert window while the service applies the default
 * when the query parameter is omitted.
 */
export class ExpiringContractsQueryDto {
  @ApiPropertyOptional({
    description: "Positive number of days to include in the expiry window.",
    default: DEFAULT_EXPIRING_CONTRACT_DAYS,
    example: 45,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;
}
