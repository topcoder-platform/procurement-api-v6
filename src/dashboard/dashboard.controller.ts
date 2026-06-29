import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ProcurementScopes } from "../app-constants";
import { Scopes } from "../auth/decorators/scopes.decorator";
import { ProcurementAccessGuard } from "../auth/guards/procurement-access.guard";
import { DashboardService } from "./dashboard.service";
import { DashboardSummaryDto } from "./dto/dashboard-summary.dto";

/**
 * Controller exposing the procurement dashboard summary endpoint.
 */
@ApiTags("Dashboard")
@ApiBearerAuth()
@UseGuards(ProcurementAccessGuard)
@Controller("dashboard")
export class DashboardController {
  /**
   * Creates a controller backed by the dashboard service.
   *
   * @param dashboardService Service that composes procurement summary data.
   */
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Returns the procurement dashboard summary.
   *
   * @returns Dashboard summary response.
   */
  @Get()
  @Scopes(ProcurementScopes.Read)
  @ApiOperation({ summary: "Get procurement dashboard summary" })
  @ApiResponse({ type: DashboardSummaryDto })
  getSummary(): Promise<DashboardSummaryDto> {
    return this.dashboardService.getSummary();
  }
}
