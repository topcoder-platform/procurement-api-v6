import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Response model returned by vendor endpoints.
 *
 * The DTO exposes vendor fields without Prisma relation metadata so callers
 * receive a stable JSON shape across list, detail, create, update, and delete.
 */
export class VendorResponseDto {
  @ApiProperty({ description: "Vendor identifier.", example: "abc123def45678" })
  id: string;

  @ApiProperty({ description: "Display name for the vendor." })
  name: string;

  @ApiPropertyOptional({ description: "Primary contact name for the vendor." })
  contactName?: string | null;

  @ApiPropertyOptional({ description: "Primary contact email for the vendor." })
  contactEmail?: string | null;

  @ApiPropertyOptional({ description: "Primary contact phone for the vendor." })
  contactPhone?: string | null;

  @ApiPropertyOptional({ description: "Vendor mailing or business address." })
  address?: string | null;

  @ApiPropertyOptional({ description: "Vendor category." })
  category?: string | null;

  @ApiPropertyOptional({ description: "Free-form internal notes." })
  notes?: string | null;

  @ApiProperty({ description: "Timestamp when the vendor was created." })
  createdAt: Date;

  @ApiProperty({ description: "Timestamp when the vendor was last updated." })
  updatedAt: Date;
}
