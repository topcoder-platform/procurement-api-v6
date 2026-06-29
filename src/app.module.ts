import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthMiddleware } from "./auth/auth.middleware";
import { ContractsModule } from "./contracts/contracts.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DbModule } from "./db/db.module";
import { HealthModule } from "./health/health.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { RenewalsModule } from "./renewals/renewals.module";
import { VendorsModule } from "./vendors/vendors.module";

/**
 * Root Nest module for the procurement API.
 *
 * The module wires global configuration, Prisma database access, the health
 * surface, and request authentication middleware for every route.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    HealthModule,
    VendorsModule,
    ContractsModule,
    InvoicesModule,
    RenewalsModule,
    DashboardModule,
  ],
})
export class AppModule implements NestModule {
  /**
   * Applies authentication middleware to every route while allowing the
   * middleware to pass through requests that have no bearer token.
   *
   * @param consumer Nest middleware consumer used to register route middleware.
   * @returns Nothing; middleware registration is performed through Nest.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes("*");
  }
}
