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
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { InvoiceListQueryDto } from "./dto/invoice-list-query.dto";
import { InvoiceResponseDto } from "./dto/invoice-response.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { InvoicesService } from "./invoices.service";

/**
 * Controller exposing invoice CRUD and overdue alert endpoints.
 */
@ApiTags("Invoices")
@ApiBearerAuth()
@UseGuards(ProcurementAccessGuard)
@Controller("invoices")
export class InvoicesController {
  /**
   * Creates a controller backed by the invoice domain service.
   *
   * @param invoicesService Service that implements invoice behavior.
   */
  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * Lists invoices with optional derived payment-state filtering.
   *
   * @param query Optional invoice list filters.
   * @returns Invoice response models with derived payment state.
   */
  @Get()
  @Scopes(ProcurementScopes.Read)
  @ApiOperation({ summary: "List procurement invoices" })
  @ApiResponse({ type: [InvoiceResponseDto] })
  findAll(@Query() query: InvoiceListQueryDto): Promise<InvoiceResponseDto[]> {
    return this.invoicesService.findAll(query);
  }

  /**
   * Lists overdue invoices.
   *
   * @returns Overdue invoice response models sorted by due date.
   */
  @Get("overdue")
  @Scopes(ProcurementScopes.Read)
  @ApiOperation({ summary: "List overdue procurement invoices" })
  @ApiResponse({ type: [InvoiceResponseDto] })
  findOverdue(): Promise<InvoiceResponseDto[]> {
    return this.invoicesService.findOverdue();
  }

  /**
   * Finds one invoice by identifier.
   *
   * @param id Invoice identifier from the route.
   * @returns Invoice response model with derived payment state.
   */
  @Get(":id")
  @Scopes(ProcurementScopes.Read)
  @ApiOperation({ summary: "Get a procurement invoice" })
  @ApiResponse({ type: InvoiceResponseDto })
  findOne(@Param("id") id: string): Promise<InvoiceResponseDto> {
    return this.invoicesService.findOne(id);
  }

  /**
   * Creates an invoice.
   *
   * @param dto Validated invoice creation payload.
   * @returns Created invoice response model.
   */
  @Post()
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Create a procurement invoice" })
  @ApiResponse({ type: InvoiceResponseDto })
  create(@Body() dto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    return this.invoicesService.create(dto);
  }

  /**
   * Updates an invoice.
   *
   * @param id Invoice identifier from the route.
   * @param dto Validated update payload.
   * @returns Updated invoice response model.
   */
  @Put(":id")
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Update a procurement invoice" })
  @ApiResponse({ type: InvoiceResponseDto })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.update(id, dto);
  }

  /**
   * Hard-deletes an invoice.
   *
   * @param id Invoice identifier from the route.
   * @returns Deleted invoice response model.
   */
  @Delete(":id")
  @Scopes(ProcurementScopes.Write)
  @ApiOperation({ summary: "Delete a procurement invoice" })
  @ApiResponse({ type: InvoiceResponseDto })
  remove(@Param("id") id: string): Promise<InvoiceResponseDto> {
    return this.invoicesService.remove(id);
  }
}
