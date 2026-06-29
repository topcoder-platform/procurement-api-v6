import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
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
import { ContractsService } from "./contracts.service";
import { ContractResponseDto } from "./dto/contract-response.dto";
import { CreateContractDto } from "./dto/create-contract.dto";
import { ExpiringContractsQueryDto } from "./dto/expiring-contracts-query.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";

/**
 * Controller exposing contract CRUD and expiry alert endpoints.
 */
@ApiTags("Contracts")
@ApiBearerAuth()
@UseGuards(ProcurementAccessGuard)
@Controller("contracts")
export class ContractsController {
  /**
   * Creates a controller backed by the contract domain service.
   *
   * @param contractsService Service that implements contract behavior.
   */
  constructor(private readonly contractsService: ContractsService) {}

  /**
   * Lists all contracts.
   *
   * @returns Contract response models with derived lifecycle fields.
   */
  @Get()
  @Scopes(ProcurementScopes.Read)
  @ApiOperation({ summary: "List procurement contracts" })
  @ApiResponse({ type: [ContractResponseDto] })
  findAll(): Promise<ContractResponseDto[]> {
    return this.contractsService.findAll();
  }

  /**
   * Lists contracts expiring within the requested day window.
   *
   * @param query Validated query containing an optional positive day window.
   * @returns Expiring contract response models sorted by nearest end date.
   */
  @Get("expiring")
  @Scopes(ProcurementScopes.Read)
  @ApiOperation({ summary: "List expiring procurement contracts" })
  @ApiResponse({ type: [ContractResponseDto] })
  findExpiring(
    @Query() query: ExpiringContractsQueryDto,
  ): Promise<ContractResponseDto[]> {
    return this.contractsService.findExpiring(query);
  }

  /**
   * Finds one contract by identifier.
   *
   * @param id Contract identifier from the route.
   * @returns Contract response model with derived lifecycle field.
   */
  @Get(":id")
  @Scopes(ProcurementScopes.Read)
  @ApiOperation({ summary: "Get a procurement contract" })
  @ApiResponse({ type: ContractResponseDto })
  findOne(@Param("id") id: string): Promise<ContractResponseDto> {
    return this.contractsService.findOne(id);
  }

  /**
   * Creates a contract.
   *
   * @param dto Validated contract creation payload.
   * @returns Created contract response model.
   */
  @Post()
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Create a procurement contract" })
  @ApiResponse({ type: ContractResponseDto })
  create(@Body() dto: CreateContractDto): Promise<ContractResponseDto> {
    return this.contractsService.create(dto);
  }

  /**
   * Updates a contract.
   *
   * @param id Contract identifier from the route.
   * @param dto Validated update payload.
   * @returns Updated contract response model.
   */
  @Put(":id")
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Update a procurement contract" })
  @ApiResponse({ type: ContractResponseDto })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateContractDto,
  ): Promise<ContractResponseDto> {
    return this.contractsService.update(id, dto);
  }

  /**
   * Hard-deletes a contract.
   *
   * @param id Contract identifier from the route.
   * @returns Deleted contract response model.
   */
  @Delete(":id")
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Delete a procurement contract" })
  @ApiResponse({ type: ContractResponseDto })
  remove(@Param("id") id: string): Promise<ContractResponseDto> {
    return this.contractsService.remove(id);
  }
}
