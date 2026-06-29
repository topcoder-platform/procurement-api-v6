import {
  Injectable,
  INestApplication,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma-backed database service for procurement data.
 *
 * The service reads `DATABASE_URL` from Nest configuration, opens the Prisma
 * connection during module initialization, and closes it during shutdown.
 */
@Injectable()
export class DbService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Creates the Prisma client with the configured PostgreSQL datasource URL.
   *
   * @param config Config service used to read `DATABASE_URL`.
   */
  constructor(config: ConfigService) {
    const databaseUrl = config.get<string>("DATABASE_URL", "");
    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }

  /**
   * Opens the Prisma connection when Nest initializes this module.
   *
   * @returns A promise that resolves after Prisma connects.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Closes the Prisma connection when Nest destroys this module.
   *
   * @returns A promise that resolves after Prisma disconnects.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Registers application shutdown when the Node process reaches `beforeExit`.
   *
   * @param app Nest application instance that should close gracefully.
   * @returns Nothing; shutdown behavior is registered as a process listener.
   */
  enableShutdownHooks(app: INestApplication): void {
    process.on("beforeExit", () => {
      void app.close();
    });
  }
}
