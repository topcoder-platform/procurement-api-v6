/** Procurement roles accepted from human JWT role claims. */
export const ProcurementRoles = {
  Admin: "procurement-admin",
  User: "procurement-user",
} as const;

/** Procurement scopes accepted from machine-token scope claims. */
export const ProcurementScopes = {
  Read: "procurement:read",
  Write: "procurement:write",
} as const;
