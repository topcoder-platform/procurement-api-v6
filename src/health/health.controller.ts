import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { HealthyHealthCheckResult, HealthService } from "./health.service";

const healthyHealthResponseExample = {
  status: "ok",
  info: {
    database: {
      status: "up",
    },
  },
  error: {},
  details: {
    database: {
      status: "up",
    },
  },
};

const unhealthyHealthResponseExample = {
  status: "error",
  info: {},
  error: {
    database: {
      status: "down",
      message: "Failed to connect to database.",
    },
  },
  details: {
    database: {
      status: "down",
      message: "Failed to connect to database.",
    },
  },
};

/**
 * HTTP controller for procurement API readiness checks.
 *
 * This controller is intentionally unguarded so operators and load balancers
 * can verify the service without presenting authentication credentials.
 */
@ApiTags("Health")
@Controller("health")
export class HealthController {
  /**
   * Creates a controller that delegates readiness checks to HealthService.
   *
   * @param healthService Service that verifies database connectivity.
   */
  constructor(private readonly healthService: HealthService) {}

  /**
   * Checks service and database readiness.
   *
   * @returns Health status details for the service and database.
   * @throws ServiceUnavailableException when the database is unavailable.
   */
  @Get()
  @ApiOperation({ summary: "Check the health of the service" })
  @ApiResponse({
    status: 200,
    description: "Service is healthy.",
    schema: { example: healthyHealthResponseExample },
  })
  @ApiResponse({
    status: 503,
    description: "Database is unavailable.",
    schema: { example: unhealthyHealthResponseExample },
  })
  check(): Promise<HealthyHealthCheckResult> {
    return this.healthService.check();
  }
}
