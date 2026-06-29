import { Module } from "@nestjs/common";
import { ProcurementAccessGuard } from "../auth/guards/procurement-access.guard";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";

/**
 * Feature module for vendor CRUD endpoints and services.
 */
@Module({
  controllers: [VendorsController],
  providers: [VendorsService, ProcurementAccessGuard],
  exports: [VendorsService],
})
export class VendorsModule {}
