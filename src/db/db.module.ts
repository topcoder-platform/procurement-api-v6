import { Global, Module } from "@nestjs/common";
import { DbService } from "./db.service";

/**
 * Global database module for Prisma access.
 *
 * Importing this module exposes the shared DbService provider to feature
 * modules without requiring repeated provider declarations.
 */
@Global()
@Module({
  providers: [DbService],
  exports: [DbService],
})
export class DbModule {}
