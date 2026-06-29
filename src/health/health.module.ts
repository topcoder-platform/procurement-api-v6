import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

/**
 * Health module exposing the service readiness route.
 *
 * The module depends on DbModule so the health service can verify database
 * connectivity through Prisma.
 */
@Module({
  imports: [DbModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
