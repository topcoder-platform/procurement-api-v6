import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProcurementRoles } from "../../app-constants";
import {
  AuthUserClaims,
  getNormalizedRoles,
  getNormalizedScopes,
} from "../claims.util";
import { SCOPES_KEY } from "../decorators/scopes.decorator";

const procurementRoles = new Set(
  Object.values(ProcurementRoles).map((role) => role.toLowerCase()),
);

/**
 * Guard enforcing procurement-specific human-role and machine-scope access.
 *
 * Human callers must have `procurement-admin` or `procurement-user`. Machine
 * callers must have an exact scope match declared by route metadata; write
 * scope is not treated as implicit read access.
 */
@Injectable()
export class ProcurementAccessGuard implements CanActivate {
  /**
   * Creates a guard that can read route scope metadata.
   *
   * @param reflector Nest reflector used for controller and handler metadata.
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Evaluates procurement access for the current request.
   *
   * @param context Nest execution context for the route being invoked.
   * @returns `true` when the caller satisfies procurement access rules.
   * @throws UnauthorizedException when no authenticated caller is available.
   * @throws ForbiddenException when the caller lacks the required role or scope.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const authUser: AuthUserClaims | undefined = context
      .switchToHttp()
      .getRequest().authUser;

    if (!authUser) {
      throw new UnauthorizedException("You are not authenticated.");
    }

    if (authUser.isMachine) {
      if (this.hasRequiredMachineScope(authUser, requiredScopes)) {
        return true;
      }

      throw new ForbiddenException(
        "You do not have the required permissions to access this resource.",
      );
    }

    if (this.hasProcurementRole(authUser)) {
      return true;
    }

    throw new ForbiddenException(
      "You do not have the required permissions to access this resource.",
    );
  }

  /**
   * Checks whether a human caller has a procurement role.
   *
   * @param authUser Authenticated user claims to inspect.
   * @returns `true` when the caller has an accepted procurement role.
   */
  private hasProcurementRole(authUser: AuthUserClaims): boolean {
    return getNormalizedRoles(authUser).some((role) =>
      procurementRoles.has(role),
    );
  }

  /**
   * Checks whether a machine caller has an exact required route scope.
   *
   * @param authUser Authenticated machine-token claims to inspect.
   * @param requiredScopes Route metadata scopes required for access.
   * @returns `true` only when metadata is present and one scope matches exactly.
   */
  private hasRequiredMachineScope(
    authUser: AuthUserClaims,
    requiredScopes: readonly string[] | undefined,
  ): boolean {
    if (!requiredScopes?.length) {
      return false;
    }

    const scopes = new Set(getNormalizedScopes(authUser));
    return requiredScopes.some((scope) => scopes.has(scope.toLowerCase()));
  }
}
