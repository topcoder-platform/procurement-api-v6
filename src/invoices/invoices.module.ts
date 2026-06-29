import { Module } from "@nestjs/common";
import { ProcurementAccessGuard } from "../auth/guards/procurement-access.guard";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";

/**
 * Feature module for invoice CRUD, overdue alerts, and dashboard reuse.
 */
@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, ProcurementAccessGuard],
  exports: [InvoicesService],
})
export class InvoicesModule {}
