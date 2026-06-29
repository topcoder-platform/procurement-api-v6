import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProcurementRoles, ProcurementScopes } from "../../app-constants";
import { ProcurementAccessGuard } from "./procurement-access.guard";

type AuthUserFixture = {
  isMachine?: boolean;
  roles?: string[];
  role?: string | string[];
  scopes?: string[];
  scope?: string | string[];
};

/**
 * Creates the minimal execution context needed by ProcurementAccessGuard tests.
 *
 * @param authUser Optional authenticated user fixture attached to the request.
 * @returns Mocked Nest execution context for guard evaluation.
 */
function createExecutionContext(authUser?: AuthUserFixture): ExecutionContext {
  return {
    getHandler: () => createExecutionContext,
    getClass: () => ProcurementAccessGuard,
    switchToHttp: () => ({
      getRequest: () => ({
        authUser,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("ProcurementAccessGuard", () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const guard = new ProcurementAccessGuard(reflector as unknown as Reflector);

  beforeEach(() => {
    reflector.getAllAndOverride.mockReset();
    reflector.getAllAndOverride.mockReturnValue([ProcurementScopes.Read]);
  });

  it("throws when no authenticated caller is present", () => {
    expect(() => guard.canActivate(createExecutionContext())).toThrow(
      UnauthorizedException,
    );
  });

  it("allows a human with procurement-user role", () => {
    expect(
      guard.canActivate(
        createExecutionContext({
          roles: [ProcurementRoles.User],
        }),
      ),
    ).toBe(true);
  });

  it("allows a human with procurement-admin role", () => {
    expect(
      guard.canActivate(
        createExecutionContext({
          roles: [ProcurementRoles.Admin],
        }),
      ),
    ).toBe(true);
  });

  it("denies a human with an unrelated role", () => {
    expect(() =>
      guard.canActivate(
        createExecutionContext({
          roles: ["project-manager"],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it("denies a human with procurement scope but no procurement role", () => {
    expect(() =>
      guard.canActivate(
        createExecutionContext({
          scopes: [ProcurementScopes.Read],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it("allows a machine caller with exact read scope", () => {
    expect(
      guard.canActivate(
        createExecutionContext({
          isMachine: true,
          scopes: [ProcurementScopes.Read],
        }),
      ),
    ).toBe(true);
  });

  it("allows a machine caller with exact write scope", () => {
    reflector.getAllAndOverride.mockReturnValue([ProcurementScopes.Write]);

    expect(
      guard.canActivate(
        createExecutionContext({
          isMachine: true,
          scopes: [ProcurementScopes.Write],
        }),
      ),
    ).toBe(true);
  });

  it("denies a machine caller with write scope on a read route", () => {
    expect(() =>
      guard.canActivate(
        createExecutionContext({
          isMachine: true,
          scopes: [ProcurementScopes.Write],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it("denies a machine caller when route scope metadata is missing", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          isMachine: true,
          scopes: [ProcurementScopes.Read],
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
