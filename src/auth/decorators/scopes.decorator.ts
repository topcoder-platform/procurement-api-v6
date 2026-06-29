import { SetMetadata } from "@nestjs/common";

export const SCOPES_KEY = "scopes";

/**
 * Attaches required machine-token scopes to a guarded controller or route.
 *
 * @param scopes Scope strings accepted for the decorated route.
 * @returns Nest metadata decorator consumed by ProcurementAccessGuard.
 */
export const Scopes = (...scopes: string[]) => SetMetadata(SCOPES_KEY, scopes);
