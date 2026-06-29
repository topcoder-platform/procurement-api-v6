import { Module } from "@nestjs/common";
import { ProcurementAccessGuard } from "../auth/guards/procurement-access.guard";
import { ContractsModule } from "../contracts/contracts.module";
import { InvoicesModule } from "../invoices/invoices.module";
import { RenewalsModule } from "../renewals/renewals.module";
import { VendorsModule } from "../vendors/vendors.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

/**
 * Feature module for the procurement dashboard summary endpoint.
 */
@Module({
  imports: [VendorsModule, ContractsModule, InvoicesModule, RenewalsModule],
  controllers: [DashboardController],
  providers: [DashboardService, ProcurementAccessGuard],
})
export class DashboardModule {}
