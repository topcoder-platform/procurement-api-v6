import {
  Injectable,
  Logger,
  NestMiddleware,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NextFunction, Request, Response } from "express";
import { middleware } from "tc-core-library-js";

const { jwtAuthenticator: authenticator } = middleware;

const logger = new Logger("AuthMiddleware");

type HeaderValue = string | string[] | undefined;

/**
 * Resolves a bearer token header from direct and proxy-forwarded header names.
 *
 * @param headers Request headers to inspect.
 * @returns The first non-empty authorization header value, or an empty string.
 */
function resolveAuthorizationHeader(
  headers: Record<string, HeaderValue>,
): string {
  const headerCandidates = [
    headers["authorization"],
    headers["x-authorization"],
    headers["x-forwarded-authorization"],
    headers["x-original-authorization"],
  ];

  for (const value of headerCandidates) {
    if (!value) {
      continue;
    }

    if (Array.isArray(value)) {
      const first = value.find(Boolean);
      if (typeof first === "string") {
        return first;
      }
    } else if (typeof value === "string") {
      return value;
    }
  }

  return "";
}

/**
 * Decodes a JWT payload without validating it for authentication diagnostics.
 *
 * @param token JWT string to inspect.
 * @returns The decoded payload when available, otherwise `null`.
 */
function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * JWT authentication middleware for procurement-api-v6.
 *
 * The middleware accepts bearer tokens from direct and proxy-forwarded headers,
 * normalizes issuer configuration for `tc-core-library-js`, logs token
 * diagnostics on failures, and lets unauthenticated requests continue so public
 * routes such as health remain reachable.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly jwtAuthenticator: any;

  /**
   * Creates the JWT authenticator with AUTH_SECRET and VALID_ISSUERS settings.
   *
   * @param configService Config service used to read authentication settings.
   */
  constructor(private readonly configService: ConfigService) {
    const authSecret = this.configService.get<string>(
      "AUTH_SECRET",
      "mysecret",
    );
    let issuersValue = this.configService.get<string>(
      "VALID_ISSUERS",
      '["https://api.topcoder.com","https://api.topcoder-dev.com","https://topcoder-dev.auth0.com/","https://auth.topcoder-dev.com/","https://topcoder.auth0.com/","https://auth.topcoder.com/"]',
    );

    if (!issuersValue.trim().startsWith("[")) {
      const issuersArray = issuersValue.split(",").map((s) => s.trim());
      issuersValue = JSON.stringify(issuersArray);
    }

    this.jwtAuthenticator = authenticator({
      AUTH_SECRET: authSecret,
      VALID_ISSUERS: issuersValue,
    });
  }

  /**
   * Authenticates requests that include a bearer token.
   *
   * @param req Express request that may receive an `authUser` from the JWT middleware.
   * @param res Express response passed through to the JWT middleware.
   * @param next Express continuation callback.
   * @returns Nothing; request flow continues through `next`.
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const authorizationHeader = resolveAuthorizationHeader(req.headers);

    if (authorizationHeader) {
      req.headers.authorization = authorizationHeader;
      this.jwtAuthenticator(req, res, (err) => {
        if (err) {
          const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
          const payload = token ? decodeTokenPayload(token) : null;
          logger.warn({
            message: "JWT authentication failed",
            error: err?.message,
            tokenIss: payload?.["iss"],
            tokenAud: payload?.["aud"],
            validIssuers: this.configService.get<string>("VALID_ISSUERS"),
          });
          return next(new UnauthorizedException(err.message));
        }
        next();
      });
    } else {
      next();
    }
  }
}
