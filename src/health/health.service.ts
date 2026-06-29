import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { DbService } from "../db/db.service";

type HealthyDatabaseStatus = {
  status: "up";
};

type UnhealthyDatabaseStatus = {
  status: "down";
  message: string;
};

export type HealthyHealthCheckResult = {
  status: "ok";
  info: {
    database: HealthyDatabaseStatus;
  };
  error: Record<string, never>;
  details: {
    database: HealthyDatabaseStatus;
  };
};

export type UnhealthyHealthCheckResult = {
  status: "error";
  info: Record<string, never>;
  error: {
    database: UnhealthyDatabaseStatus;
  };
  details: {
    database: UnhealthyDatabaseStatus;
  };
};

export type HealthCheckResult =
  | HealthyHealthCheckResult
  | UnhealthyHealthCheckResult;

/**
 * Service-level health checker for procurement-api-v6.
 *
 * The service uses the shared Prisma DbService to verify the database is
 * reachable, then returns the status shape expected by adjacent APIs.
 */
@Injectable()
export class HealthService {
  /**
   * Creates a health service that can query the database through Prisma.
   *
   * @param db Prisma-backed database service.
   */
  constructor(private readonly db: DbService) {}

  /**
   * Performs a lightweight database readiness check.
   *
   * @returns A health status payload when the database responds.
   * @throws ServiceUnavailableException with an unhealthy payload when the database is unreachable.
   */
  async check(): Promise<HealthyHealthCheckResult> {
    try {
      await this.db.$queryRaw`SELECT 1`;
    } catch (error) {
      const database = {
        status: "down" as const,
        message:
          error instanceof Error
            ? error.message
            : "Failed to connect to database.",
      };

      throw new ServiceUnavailableException({
        status: "error",
        info: {},
        error: {
          database,
        },
        details: {
          database,
        },
      } satisfies UnhealthyHealthCheckResult);
    }

    return {
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
  }
}
