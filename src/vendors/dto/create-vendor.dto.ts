import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Request body used to create a procurement vendor.
 *
 * The DTO captures the vendor profile fields stored directly on the Vendor
 * model. Optional fields may be omitted when the supplier record is created.
 */
export class CreateVendorDto {
  @ApiProperty({
    description: "Display name for the vendor.",
    example: "Acme Software",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: "Primary contact name for the vendor.",
    example: "Alex Smith",
  })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({
    description: "Primary contact email address for the vendor.",
    example: "alex.smith@example.com",
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: "Primary contact phone number for the vendor.",
    example: "+1 555 0100",
  })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({
    description: "Vendor mailing or business address.",
    example: "100 Market Street, San Francisco, CA",
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: "Vendor category used for procurement grouping.",
    example: "Software",
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: "Free-form internal notes about the vendor.",
    example: "Preferred supplier for design tooling.",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
