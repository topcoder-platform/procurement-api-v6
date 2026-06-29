import { ApiProperty } from "@nestjs/swagger";
import { RenewalStage } from "@prisma/client";
import { IsEnum } from "class-validator";

/**
 * Request body used to move a renewal workflow to an adjacent target stage.
 */
export class UpdateRenewalStageDto {
  @ApiProperty({
    description: "Target renewal workflow stage.",
    enum: RenewalStage,
    example: RenewalStage.vra,
  })
  @IsEnum(RenewalStage)
  targetStage: RenewalStage;
}
