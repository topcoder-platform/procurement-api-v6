import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { CreateRenewalDto } from "./dto/create-renewal.dto";
import { RenewalResponseDto } from "./dto/renewal-response.dto";
import { RenewalStageDto } from "./dto/renewal-stage.dto";
import { UpdateRenewalStageDto } from "./dto/update-renewal-stage.dto";
import { UpdateRenewalDto } from "./dto/update-renewal.dto";
import { RenewalsService } from "./renewals.service";

/**
 * Controller exposing renewal CRUD and stage workflow endpoints.
 */
@ApiTags("Renewals")
@ApiBearerAuth()
@UseGuards(ProcurementAccessGuard)
@Controller("renewals")
export class RenewalsController {
  /**
   * Creates a controller backed by the renewal domain service.
   *
   * @param renewalsService Service that implements renewal behavior.
   */
  constructor(private readonly renewalsService: RenewalsService) {}

  /**
   * Lists all renewal workflows.
   *
   * @returns Renewal response models with stage metadata and contract context.
   */
  @Get()
  @Scopes(ProcurementScopes.Read)
  @ApiOperation({ summary: "List procurement renewals" })
  @ApiResponse({ type: [RenewalResponseDto] })
  findAll(): Promise<RenewalResponseDto[]> {
    return this.renewalsService.findAll();
  }

  /**
   * Lists available workflow stages.
   *
   * @returns Stage metadata in workflow order.
   */
  @Get("stages")
  @Scopes(ProcurementScopes.Read)
  @ApiOperation({ summary: "List procurement renewal stages" })
  @ApiResponse({ type: [RenewalStageDto] })
  listStages(): RenewalStageDto[] {
    return this.renewalsService.listStages();
  }

  /**
   * Finds one renewal by identifier.
   *
   * @param id Renewal identifier from the route.
   * @returns Renewal response model with stage metadata.
   */
  @Get(":id")
  @Scopes(ProcurementScopes.Read)
  @ApiOperation({ summary: "Get a procurement renewal" })
  @ApiResponse({ type: RenewalResponseDto })
  findOne(@Param("id") id: string): Promise<RenewalResponseDto> {
    return this.renewalsService.findOne(id);
  }

  /**
   * Creates a renewal workflow at quotation stage.
   *
   * @param dto Validated renewal creation payload.
   * @returns Created renewal response model.
   */
  @Post()
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Create a procurement renewal" })
  @ApiResponse({ type: RenewalResponseDto })
  create(@Body() dto: CreateRenewalDto): Promise<RenewalResponseDto> {
    return this.renewalsService.create(dto);
  }

  /**
   * Replaces editable renewal details without moving workflow stage.
   *
   * @param id Renewal identifier from the route.
   * @param dto Validated replacement payload.
   * @returns Updated renewal response model.
   */
  @Put(":id")
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Replace a procurement renewal" })
  @ApiResponse({ type: RenewalResponseDto })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateRenewalDto,
  ): Promise<RenewalResponseDto> {
    return this.renewalsService.update(id, dto);
  }

  /**
   * Moves a renewal to an adjacent target stage.
   *
   * @param id Renewal identifier from the route.
   * @param dto Target-stage payload.
   * @returns Updated renewal response model.
   */
  @Patch(":id/stage")
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Move a procurement renewal stage" })
  @ApiResponse({ type: RenewalResponseDto })
  transitionStage(
    @Param("id") id: string,
    @Body() dto: UpdateRenewalStageDto,
  ): Promise<RenewalResponseDto> {
    return this.renewalsService.transitionStage(id, dto.targetStage);
  }

  /**
   * Hard-deletes a renewal workflow.
   *
   * @param id Renewal identifier from the route.
   * @returns Deleted renewal response model.
   */
  @Delete(":id")
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Delete a procurement renewal" })
  @ApiResponse({ type: RenewalResponseDto })
  remove(@Param("id") id: string): Promise<RenewalResponseDto> {
    return this.renewalsService.remove(id);
  }
}
