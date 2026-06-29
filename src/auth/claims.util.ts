export type AuthUserClaims = {
  isMachine?: boolean;
  role?: string[] | string;
  roles?: string[] | string;
  scope?: string[] | string;
  scopes?: string[] | string;
};

const topcoderRolePrefixPattern = /^topcoder\s+/i;

/**
 * Normalizes string claims into trimmed, lowercase values.
 *
 * @param values Claim value or values to normalize.
 * @param separator Separator used when the claim is a single string.
 * @returns Normalized claim values with empty entries removed.
 */
function normalizeClaims(
  values: readonly string[] | string | undefined,
  separator: RegExp,
): string[] {
  const normalizedValues = Array.isArray(values)
    ? values
    : typeof values === "string"
      ? values.split(separator)
      : [];

  return normalizedValues
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => !!value);
}

/**
 * Normalizes role claims and removes the common Topcoder role prefix.
 *
 * @param values Role claim value or values from a JWT.
 * @returns Lowercase role values suitable for exact role comparisons.
 */
function normalizeRoles(
  values: readonly string[] | string | undefined,
): string[] {
  return normalizeClaims(values, /,/).map((role) =>
    role.replace(topcoderRolePrefixPattern, ""),
  );
}

/**
 * Normalizes scope claims that may be space-delimited strings or arrays.
 *
 * @param values Scope claim value or values from a token.
 * @returns Lowercase scope values suitable for exact scope comparisons.
 */
function normalizeScopes(
  values: readonly string[] | string | undefined,
): string[] {
  return normalizeClaims(values, /\s+/);
}

/**
 * Returns normalized role claims from both `roles` and `role`.
 *
 * @param authUser Authenticated user object attached by the auth middleware.
 * @returns Lowercase normalized role values.
 */
export function getNormalizedRoles(authUser?: AuthUserClaims): string[] {
  return [
    ...normalizeRoles(authUser?.roles),
    ...normalizeRoles(authUser?.role),
  ];
}

/**
 * Returns normalized scope claims from both `scopes` and `scope`.
 *
 * @param authUser Authenticated user object attached by the auth middleware.
 * @returns Lowercase normalized scope values.
 */
export function getNormalizedScopes(authUser?: AuthUserClaims): string[] {
  return [
    ...normalizeScopes(authUser?.scopes),
    ...normalizeScopes(authUser?.scope),
  ];
}
