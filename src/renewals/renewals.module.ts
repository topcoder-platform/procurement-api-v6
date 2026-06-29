import { Module } from "@nestjs/common";
import { ProcurementAccessGuard } from "../auth/guards/procurement-access.guard";
import { RenewalsController } from "./renewals.controller";
import { RenewalsService } from "./renewals.service";

/**
 * Feature module for renewal CRUD, workflow transitions, and dashboard reuse.
 */
@Module({
  controllers: [RenewalsController],
  providers: [RenewalsService, ProcurementAccessGuard],
  exports: [RenewalsService],
})
export class RenewalsModule {}
