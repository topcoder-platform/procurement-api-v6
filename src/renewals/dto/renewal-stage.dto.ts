import { ApiProperty } from "@nestjs/swagger";
import { RenewalStage } from "@prisma/client";

/**
 * Response model describing an available renewal workflow stage.
 */
export class RenewalStageDto {
  @ApiProperty({ description: "Renewal stage enum value.", enum: RenewalStage })
  stage: RenewalStage;

  @ApiProperty({
    description: "Human-readable stage label.",
    example: "Quotation",
  })
  label: string;

  @ApiProperty({
    description: "One-based stage order in the workflow.",
    example: 1,
  })
  order: number;

  @ApiProperty({
    description: "Whether this stage is terminal.",
    example: false,
  })
  terminal: boolean;
}
