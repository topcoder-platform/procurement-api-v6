import { Injectable } from "@nestjs/common";
import { ContractsService } from "../contracts/contracts.service";
import { InvoicesService } from "../invoices/invoices.service";
import { RenewalsService } from "../renewals/renewals.service";
import { VendorsService } from "../vendors/vendors.service";
import { DashboardSummaryDto } from "./dto/dashboard-summary.dto";

const DASHBOARD_EXPIRING_PREVIEW_LIMIT = 5;

/**
 * Service composing procurement domain services into dashboard totals.
 *
 * Dashboard logic reuses the same service methods and derived alert rules used
 * by contract, invoice, vendor, and renewal endpoints.
 */
@Injectable()
export class DashboardService {
  /**
   * Creates a dashboard service from exported procurement domain services.
   *
   * @param vendorsService Vendor service used for vendor count.
   * @param contractsService Contract service used for active and expiring counts.
   * @param invoicesService Invoice service used for pending and overdue totals.
   * @param renewalsService Renewal service used for active workflow count.
   */
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly contractsService: ContractsService,
    private readonly invoicesService: InvoicesService,
    private readonly renewalsService: RenewalsService,
  ) {}

  /**
   * Builds the Batch 2 procurement dashboard summary.
   *
   * @returns Counts, totals, and preview rows for the dashboard endpoint.
   */
  async getSummary(): Promise<DashboardSummaryDto> {
    const [
      vendorCount,
      activeContractCount,
      invoiceBuckets,
      expiringContracts,
      activeRenewalCount,
    ] = await Promise.all([
      this.vendorsService.count(),
      this.contractsService.countActive(),
      this.invoicesService.getDashboardBuckets(),
      this.contractsService.findExpiring(),
      this.renewalsService.countActive(),
    ]);

    return {
      vendorCount,
      activeContractCount,
      pendingInvoiceCount: invoiceBuckets.pending.count,
      pendingInvoiceTotal: invoiceBuckets.pending.total,
      overdueInvoiceCount: invoiceBuckets.overdue.count,
      overdueInvoiceTotal: invoiceBuckets.overdue.total,
      expiringContractCount: expiringContracts.length,
      expiringContracts: expiringContracts.slice(
        0,
        DASHBOARD_EXPIRING_PREVIEW_LIMIT,
      ),
      activeRenewalCount,
    };
  }
}
