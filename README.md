## Description

Procurement API v6 is the backend service for vendor, contract, invoice,
renewal, and dashboard workflows.  This service is used by the procurement platform-ui sub-app, interal to Topcoder staff.

## Routes

All business routes are served under `/v6/procurement` and require bearer auth.

### System

* `GET /v6/procurement/health` checks service and database readiness.
* `/v6/procurement/api-docs` exposes Swagger documentation.

### Dashboard

* `GET /v6/procurement/dashboard` returns vendor count, active contract count,
  pending/overdue invoice counts and totals, expiring contract preview rows, and
  active renewal count.

### Vendors

* `GET /v6/procurement/vendors` lists vendors.
* `GET /v6/procurement/vendors/:id` returns one vendor.
* `POST /v6/procurement/vendors` creates a vendor.
* `PUT /v6/procurement/vendors/:id` replaces a vendor.
* `DELETE /v6/procurement/vendors/:id` hard-deletes a vendor.

### Contracts

* `GET /v6/procurement/contracts` lists contracts with vendor summaries and
  derived lifecycle.
* `GET /v6/procurement/contracts/expiring?days=30` lists active contracts whose
  end date falls inside the expiry window.
* `GET /v6/procurement/contracts/:id` returns one contract.
* `POST /v6/procurement/contracts` creates a contract.
* `PUT /v6/procurement/contracts/:id` replaces a contract.
* `DELETE /v6/procurement/contracts/:id` hard-deletes a contract.

### Invoices

* `GET /v6/procurement/invoices` lists invoices with vendor, optional contract,
  and derived payment-state summaries.
* `GET /v6/procurement/invoices?state=pending` filters by derived invoice state.
* `GET /v6/procurement/invoices/overdue` lists overdue invoices.
* `GET /v6/procurement/invoices/:id` returns one invoice.
* `POST /v6/procurement/invoices` creates an invoice.
* `PUT /v6/procurement/invoices/:id` replaces an invoice.
* `DELETE /v6/procurement/invoices/:id` hard-deletes an invoice.

### Renewals

* `GET /v6/procurement/renewals` lists renewals with contract and vendor
  context.
* `GET /v6/procurement/renewals/stages` returns workflow stage metadata.
* `GET /v6/procurement/renewals/:id` returns one renewal.
* `POST /v6/procurement/renewals` creates a renewal at `quotation` and stamps
  `quotationAt`.
* `PUT /v6/procurement/renewals/:id` replaces editable renewal fields without
  changing workflow stage.
* Create and replace normalize `newStartDate` and `newEndDate` to the submitted
  business dates at midnight UTC.
* `PATCH /v6/procurement/renewals/:id/stage` moves one workflow stage forward or
  backward. `po_release` is terminal and finalizes contract dates plus optional
  value in one transaction, applying the normalized renewal dates to the
  contract.
* `DELETE /v6/procurement/renewals/:id` hard-deletes a renewal.

## Derived States

The API does not persist alert-only states:

* Contract `lifecycle` is derived from stored `Contract.status` and `endDate`.
* Invoice `paymentState` is derived from stored `Invoice.status`, `dueDate`, and
  `paidDate`.
* Active renewals are renewals whose `stage` is not `po_release`.

Money fields are serialized as numbers in read models and dashboard totals.

## Access

Health remains unguarded. Every business controller uses
`ProcurementAccessGuard` and exact scope metadata on each handler.

| Caller type | Required access | Notes |
| --- | --- | --- |
| Human | `procurement-user` or `procurement-admin` role | Role claims may be supplied through `role` or `roles`. |
| Machine read | `procurement:read` scope | Write scope is not treated as implicit read access. |
| Machine write | `procurement:write` scope | Required for create, replace, delete, and renewal stage movement. |
| Missing route scope metadata | Denied for machine callers | Business handlers must declare explicit scopes. |

Authentication is delegated to the shared bearer-token middleware. Local login
and local user-management endpoints are intentionally absent from this service.

## Configuration

Required:

* `DATABASE_URL` - PostgreSQL connection string used by Prisma.
* `AUTH_SECRET` - JWT secret used by `tc-core-library-js`.
* `VALID_ISSUERS` - JSON array or comma-separated issuer list accepted by the auth middleware.

Optional:

* `PORT` - HTTP port, default `3000`.

## Local Development

Node.js 26.5.1 and pnpm 10.33.2 are the supported local toolchain. Run
`nvm use`, install dependencies with `pnpm install`, generate Prisma with
`pnpm prisma generate`, and start the service with `pnpm start:dev`.

## Container Runtime

The production image uses Alpine 3.24's patched Node.js 26.5.1 package and runs
as the unprivileged `app` user (UID 10001). Build-only package managers and
development dependencies are excluded from the final image.
