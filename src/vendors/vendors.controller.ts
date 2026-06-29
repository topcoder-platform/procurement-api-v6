import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ProcurementScopes } from "../app-constants";
import { Scopes } from "../auth/decorators/scopes.decorator";
import { ProcurementAccessGuard } from "../auth/guards/procurement-access.guard";
import { CreateVendorDto } from "./dto/create-vendor.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { VendorResponseDto } from "./dto/vendor-response.dto";
import { VendorsService } from "./vendors.service";

/**
 * Controller exposing vendor CRUD endpoints under `/v6/procurement/vendors`.
 */
@ApiTags("Vendors")
@ApiBearerAuth()
@UseGuards(ProcurementAccessGuard)
@Controller("vendors")
export class VendorsController {
  /**
   * Creates a controller backed by the vendor domain service.
   *
   * @param vendorsService Service that implements vendor CRUD behavior.
   */
  constructor(private readonly vendorsService: VendorsService) {}

  /**
   * Lists all vendors.
   *
   * @returns Vendor response models for all vendors.
   */
  @Get()
  @Scopes(ProcurementScopes.Read)
  @ApiOperation({ summary: "List procurement vendors" })
  @ApiResponse({ type: [VendorResponseDto] })
  findAll(): Promise<VendorResponseDto[]> {
    return this.vendorsService.findAll();
  }

  /**
   * Finds one vendor by identifier.
   *
   * @param id Vendor identifier from the route.
   * @returns Vendor response model.
   */
  @Get(":id")
  @Scopes(ProcurementScopes.Read)
  @ApiOperation({ summary: "Get a procurement vendor" })
  @ApiResponse({ type: VendorResponseDto })
  findOne(@Param("id") id: string): Promise<VendorResponseDto> {
    return this.vendorsService.findOne(id);
  }

  /**
   * Creates a vendor.
   *
   * @param dto Validated vendor creation payload.
   * @returns Created vendor response model.
   */
  @Post()
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Create a procurement vendor" })
  @ApiResponse({ type: VendorResponseDto })
  create(@Body() dto: CreateVendorDto): Promise<VendorResponseDto> {
    return this.vendorsService.create(dto);
  }

  /**
   * Replaces a vendor.
   *
   * @param id Vendor identifier from the route.
   * @param dto Validated replacement payload.
   * @returns Updated vendor response model.
   */
  @Put(":id")
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Replace a procurement vendor" })
  @ApiResponse({ type: VendorResponseDto })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateVendorDto,
  ): Promise<VendorResponseDto> {
    return this.vendorsService.update(id, dto);
  }

  /**
   * Hard-deletes a vendor.
   *
   * @param id Vendor identifier from the route.
   * @returns Deleted vendor response model.
   */
  @Delete(":id")
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Delete a procurement vendor" })
  @ApiResponse({ type: VendorResponseDto })
  remove(@Param("id") id: string): Promise<VendorResponseDto> {
    return this.vendorsService.remove(id);
  }
}
