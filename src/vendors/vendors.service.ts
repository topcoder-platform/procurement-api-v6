import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Vendor } from "@prisma/client";
import { DbService } from "../db/db.service";
import { CreateVendorDto } from "./dto/create-vendor.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { VendorResponseDto } from "./dto/vendor-response.dto";

/**
 * Service implementing hard-delete CRUD for procurement vendors.
 *
 * The service talks directly to Prisma through DbService and translates common
 * persistence failures into domain-friendly HTTP exceptions for controllers.
 */
@Injectable()
export class VendorsService {
  /**
   * Creates a vendor service backed by the shared Prisma database service.
   *
   * @param db Prisma-backed database service for procurement data.
   */
  constructor(private readonly db: DbService) {}

  /**
   * Lists all vendors sorted by display name.
   *
   * @returns Vendor response models for every vendor in the database.
   */
  async findAll(): Promise<VendorResponseDto[]> {
    const vendors = await this.db.vendor.findMany({
      orderBy: { name: "asc" },
    });

    return vendors.map((vendor) => this.toResponse(vendor));
  }

  /**
   * Finds one vendor by identifier.
   *
   * @param id Vendor identifier to load.
   * @returns Vendor response model for the requested vendor.
   * @throws NotFoundException when no vendor exists for the identifier.
   */
  async findOne(id: string): Promise<VendorResponseDto> {
    return this.toResponse(await this.findVendorOrThrow(id));
  }

  /**
   * Creates a vendor.
   *
   * @param dto Validated vendor creation payload.
   * @returns Created vendor response model.
   */
  async create(dto: CreateVendorDto): Promise<VendorResponseDto> {
    const vendor = await this.db.vendor.create({
      data: {
        name: dto.name,
        contactName: dto.contactName ?? null,
        contactEmail: dto.contactEmail ?? null,
        contactPhone: dto.contactPhone ?? null,
        address: dto.address ?? null,
        category: dto.category ?? null,
        notes: dto.notes ?? null,
      },
    });

    return this.toResponse(vendor);
  }

  /**
   * Replaces editable vendor fields.
   *
   * @param id Vendor identifier to replace.
   * @param dto Validated replacement payload.
   * @returns Updated vendor response model.
   * @throws NotFoundException when no vendor exists for the identifier.
   */
  async update(id: string, dto: UpdateVendorDto): Promise<VendorResponseDto> {
    await this.findVendorOrThrow(id);

    const vendor = await this.db.vendor.update({
      where: { id },
      data: {
        name: dto.name,
        contactName: dto.contactName ?? null,
        contactEmail: dto.contactEmail ?? null,
        contactPhone: dto.contactPhone ?? null,
        address: dto.address ?? null,
        category: dto.category ?? null,
        notes: dto.notes ?? null,
      },
    });

    return this.toResponse(vendor);
  }

  /**
   * Hard-deletes a vendor.
   *
   * @param id Vendor identifier to delete.
   * @returns Deleted vendor response model.
   * @throws NotFoundException when no vendor exists for the identifier.
   * @throws ConflictException when contracts or invoices still reference it.
   */
  async remove(id: string): Promise<VendorResponseDto> {
    await this.findVendorOrThrow(id);

    try {
      const vendor = await this.db.vendor.delete({ where: { id } });
      return this.toResponse(vendor);
    } catch (error) {
      if (this.isPrismaErrorCode(error, "P2003")) {
        throw new ConflictException(
          `Vendor "${id}" cannot be deleted while contracts or invoices reference it.`,
        );
      }

      throw error;
    }
  }

  /**
   * Counts vendors for dashboard summaries.
   *
   * @returns Total number of vendors.
   */
  count(): Promise<number> {
    return this.db.vendor.count();
  }

  /**
   * Loads a vendor record or throws a domain not-found exception.
   *
   * @param id Vendor identifier to load.
   * @returns Vendor record from Prisma.
   * @throws NotFoundException when no vendor exists for the identifier.
   */
  private async findVendorOrThrow(id: string): Promise<Vendor> {
    const vendor = await this.db.vendor.findUnique({ where: { id } });

    if (!vendor) {
      throw new NotFoundException(`Vendor "${id}" was not found.`);
    }

    return vendor;
  }

  /**
   * Converts a Prisma vendor record into the stable API response shape.
   *
   * @param vendor Vendor record returned by Prisma.
   * @returns Vendor response model.
   */
  private toResponse(vendor: Vendor): VendorResponseDto {
    return {
      id: vendor.id,
      name: vendor.name,
      contactName: vendor.contactName,
      contactEmail: vendor.contactEmail,
      contactPhone: vendor.contactPhone,
      address: vendor.address,
      category: vendor.category,
      notes: vendor.notes,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }

  /**
   * Checks whether an unknown error is a Prisma error with a specific code.
   *
   * @param error Unknown error thrown by Prisma.
   * @param code Prisma error code to match.
   * @returns `true` when the error carries the requested Prisma code.
   */
  private isPrismaErrorCode(error: unknown, code: string): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === code
    );
  }
}
