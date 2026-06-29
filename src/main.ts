import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { DbService } from "./db/db.service";

/**
 * Bootstraps the procurement API Nest application.
 *
 * The function enables CORS, validation, the v6 procurement route prefix,
 * Swagger documentation, and Prisma-backed graceful shutdown handling.
 *
 * @returns A promise that resolves after the HTTP server starts listening.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const port = Number(process.env.PORT || 3000);

  app.setGlobalPrefix("v6/procurement");

  const prismaService = app.get(DbService);
  prismaService.enableShutdownHooks(app);

  const config = new DocumentBuilder()
    .setTitle("Topcoder Procurement API")
    .setDescription(
      "API foundation for managing procurement vendors, contracts, invoices, and renewals",
    )
    .setVersion("6.0")
    .setBasePath("v6/procurement")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("/v6/procurement/api-docs", app, document);

  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(
    `Swagger docs available at: ${await app.getUrl()}/v6/procurement/api-docs`,
  );
}

bootstrap().catch(console.error);
