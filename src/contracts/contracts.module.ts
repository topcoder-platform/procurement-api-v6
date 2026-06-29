import { Module } from "@nestjs/common";
import { ProcurementAccessGuard } from "../auth/guards/procurement-access.guard";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";

/**
 * Feature module for contract CRUD, expiry alerts, and dashboard reuse.
 */
@Module({
  controllers: [ContractsController],
  providers: [ContractsService, ProcurementAccessGuard],
  exports: [ContractsService],
})
export class ContractsModule {}
