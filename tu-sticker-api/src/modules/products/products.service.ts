import { ObjectId } from "mongodb";
import { Product, ProductCreateInput, ProductCustomization, ProductCustomizationInputType, ProductUpdateInput } from "./products.model";
import { ProductsRepository } from "./products.repository";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors/AppError";
import { CategoriesRepository } from "../categories/categories.repository";
import type { UserRole } from "../auth/auth.model";

export class ProductsService {
    private readonly productsRepository = new ProductsRepository();
    private readonly categoriesRepository = new CategoriesRepository();

    async create(data: ProductCreateInput, actorRole: UserRole): Promise<Product> {
        const name = this.requireString(data.name, "name");
        const description = this.requireString(data.description, "description");
        const category = await this.requireCategorySlug(data.category);
        const price = this.requirePositiveNumber(data.price, "price");
        if (data.stock !== undefined) {
            throw new BadRequestError("El stock debe registrarse mediante el módulo de inventario");
        }
        const images = data.images === undefined ? [] : this.requireStringArray(data.images, "images");
        if (data.isCustomizable !== undefined && typeof data.isCustomizable !== "boolean") {
            throw new BadRequestError("El campo 'isCustomizable' debe ser booleano");
        }
        const isCustomizable = data.isCustomizable ?? false;
        const customizationSelectionMode = data.customizationSelectionMode === undefined
            ? "multiple"
            : this.requireCustomizationSelectionMode(data.customizationSelectionMode);
        if (actorRole !== "ADMIN" && (isCustomizable || data.customizations !== undefined || data.customizationSelectionMode !== undefined)) {
            throw new ForbiddenError("Solo un administrador puede configurar las personalizaciones del producto");
        }
        const customizations = data.customizations === undefined
            ? []
            : this.requireCustomizations(data.customizations);
        this.requireCustomizableConfiguration(isCustomizable, customizations);
        const isActive = typeof data.isActive === "boolean" ? data.isActive : true;
        const inventoryManaged = typeof data.inventoryManaged === "boolean" ? data.inventoryManaged : false;
        const requiresSupplierFallback = typeof data.requiresSupplierFallback === "boolean" ? data.requiresSupplierFallback : false;
        const stockAlertThreshold = data.stockAlertThreshold !== undefined ? this.requireNonNegativeNumber(data.stockAlertThreshold, "stockAlertThreshold") : undefined;

        const slug = this.createSlug(name);
        const existingProduct = await this.productsRepository.findBySlug(slug);
        if (existingProduct) {
            throw new BadRequestError("Ya existe un producto con ese nombre");
        }

        const now = new Date();

        return this.productsRepository.create({
            name,
            slug,
            description,
            price,
            category,
            images,
            isActive,
            isCustomizable,
            customizationSelectionMode,
            customizations,
            inventoryManaged,
            stock: undefined,
            stockAlertThreshold,
            requiresSupplierFallback,
            createdAt: now,
            updatedAt: now,
        });
    }

    async findAll(): Promise<Product[]> {
        return this.productsRepository.findAll();
    }

    async findById(id: string): Promise<Product> {
        const product = ObjectId.isValid(id)
            ? await this.productsRepository.findById(new ObjectId(id))
            : await this.productsRepository.findBySlug(this.createSlug(this.requireString(id, "id")));
        if (!product) {
            throw new NotFoundError("Producto no encontrado");
        }
        return product;
    }

    async findBySlug(slug: string): Promise<Product> {
        const normalizedSlug = this.createSlug(this.requireString(slug, "slug"));
        const product = await this.productsRepository.findBySlug(normalizedSlug);
        if (!product) {
            throw new NotFoundError("Producto no encontrado");
        }
        return product;
    }

    async findByCategory(category: string): Promise<Product[]> {
        const normalizedCategory = this.createSlug(this.requireString(category, "category"));
        return this.productsRepository.findByCategory(normalizedCategory);
    }

    async update(id: string, data: ProductUpdateInput, actorRole: UserRole): Promise<Product> {
        const objectId = this.toObjectId(id);
        const currentProduct = await this.productsRepository.findById(objectId);
        if (!currentProduct) {
            throw new NotFoundError("Producto no encontrado");
        }

        if (actorRole !== "ADMIN" && (
            data.isCustomizable !== undefined
            || data.customizations !== undefined
            || data.customizationSelectionMode !== undefined
        )) {
            throw new ForbiddenError("Solo un administrador puede configurar las personalizaciones del producto");
        }

        const changes: Partial<Product> = {};

        if (data.name !== undefined) {
            changes.name = this.requireString(data.name, "name");
            changes.slug = this.createSlug(changes.name);

            const existingProduct = await this.productsRepository.findBySlug(changes.slug);
            if (existingProduct && !existingProduct._id?.equals(objectId)) {
                throw new BadRequestError("Ya existe un producto con ese nombre");
            }
        }

        if (data.description !== undefined) {
            changes.description = this.requireString(data.description, "description");
        }

        if (data.price !== undefined) {
            changes.price = this.requirePositiveNumber(data.price, "price");
        }

        if (data.category !== undefined) {
            changes.category = await this.requireCategorySlug(data.category);
        }

        if (data.images !== undefined) {
            changes.images = this.requireStringArray(data.images, "images");
        }

        if (data.isActive !== undefined) {
            if (typeof data.isActive !== "boolean") {
                throw new BadRequestError("El campo 'isActive' debe ser booleano");
            }
            changes.isActive = data.isActive;
        }

        if (data.isCustomizable !== undefined) {
            if (typeof data.isCustomizable !== "boolean") {
                throw new BadRequestError("El campo 'isCustomizable' debe ser booleano");
            }
            changes.isCustomizable = data.isCustomizable;
        }

        if (data.customizations !== undefined) {
            changes.customizations = this.requireCustomizations(data.customizations);
        }

        if (data.customizationSelectionMode !== undefined) {
            changes.customizationSelectionMode = this.requireCustomizationSelectionMode(data.customizationSelectionMode);
        }

        if (data.isCustomizable !== undefined || data.customizations !== undefined || data.customizationSelectionMode !== undefined) {
            const isCustomizable = changes.isCustomizable ?? currentProduct.isCustomizable;
            const customizations = changes.customizations ?? currentProduct.customizations ?? [];
            this.requireCustomizableConfiguration(isCustomizable, customizations);
        }

        if (data.inventoryManaged !== undefined) {
            if (typeof data.inventoryManaged !== "boolean") {
                throw new BadRequestError("El campo 'inventoryManaged' debe ser booleano");
            }
            changes.inventoryManaged = data.inventoryManaged;
        }

        if (data.stock !== undefined) {
            throw new BadRequestError("El stock debe modificarse mediante el módulo de inventario");
        }

        if (data.stockAlertThreshold !== undefined) {
            changes.stockAlertThreshold = this.requireNonNegativeNumber(data.stockAlertThreshold, "stockAlertThreshold");
        }

        if (data.requiresSupplierFallback !== undefined) {
            if (typeof data.requiresSupplierFallback !== "boolean") {
                throw new BadRequestError("El campo 'requiresSupplierFallback' debe ser booleano");
            }
            changes.requiresSupplierFallback = data.requiresSupplierFallback;
        }

        if (Object.keys(changes).length === 0) {
            throw new BadRequestError("No se enviaron campos para actualizar");
        }

        const updatedProduct = await this.productsRepository.update(objectId, changes);
        if (!updatedProduct) {
            throw new NotFoundError("Producto no encontrado");
        }
        return updatedProduct;
    }

    async delete(id: string): Promise<void> {
        const objectId = this.toObjectId(id);
        const product = await this.productsRepository.findById(objectId);
        if (!product) {
            throw new NotFoundError("Producto no encontrado");
        }

        const deleted = await this.productsRepository.delete(objectId);
        if (!deleted) {
            throw new NotFoundError("Producto no encontrado");
        }
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== "string" || value.trim() === "") {
            throw new BadRequestError(`El campo '${field}' es obligatorio y debe ser texto no vacío`);
        }
        return value.trim();
    }

    private requirePositiveNumber(value: unknown, field: string): number {
        if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
            throw new BadRequestError(`El campo '${field}' debe ser un número mayor que cero`);
        }
        return value;
    }

    private requireNonNegativeNumber(value: unknown, field: string): number {
        if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
            throw new BadRequestError(`El campo '${field}' debe ser un número mayor o igual a cero`);
        }
        return value;
    }

    private requireStringArray(value: unknown, field: string): string[] {
        if (!Array.isArray(value)) {
            throw new BadRequestError(`El campo '${field}' debe ser un arreglo`);
        }
        if (value.length > 8) {
            throw new BadRequestError(`El campo '${field}' no puede contener más de 8 imágenes`);
        }

        return value.map((item, index) => this.requireString(item, `${field}[${index}]`));
    }

    private requireCustomizations(value: unknown): ProductCustomization[] {
        if (!Array.isArray(value)) {
            throw new BadRequestError("El campo 'customizations' debe ser un arreglo");
        }

        return value.map((item, index) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
                throw new BadRequestError(`La personalización ${index + 1} debe ser un objeto`);
            }

            const customization = item as Record<string, unknown>;
            const name = this.requireString(customization.name, `customizations[${index}].name`);
            const amount = this.requireNonNegativeNumber(customization.value, `customizations[${index}].value`);
            const inputType = customization.inputType;
            const validInputTypes: ProductCustomizationInputType[] = ["none", "text", "file"];

            if (typeof inputType !== "string" || !validInputTypes.includes(inputType as ProductCustomizationInputType)) {
                throw new BadRequestError(`El campo 'customizations[${index}].inputType' debe ser none, text o file`);
            }
            if (typeof customization.required !== "boolean") {
                throw new BadRequestError(`El campo 'customizations[${index}].required' debe ser booleano`);
            }

            return {
                name,
                value: amount,
                inputType: inputType as ProductCustomizationInputType,
                required: customization.required,
            };
        });
    }

    private requireCustomizableConfiguration(isCustomizable: boolean, customizations: ProductCustomization[]): void {
        if (isCustomizable && customizations.length === 0) {
            throw new BadRequestError("Un producto personalizable debe tener al menos una personalización configurada");
        }
    }

    private requireCustomizationSelectionMode(value: unknown): "single" | "multiple" {
        if (value !== "single" && value !== "multiple") {
            throw new BadRequestError("El modo de selección debe ser 'single' o 'multiple'");
        }
        return value;
    }

    private async requireCategorySlug(value: unknown): Promise<string> {
        const category = this.requireString(value, "category");
        const slug = this.createSlug(category);
        const existingCategory = await this.categoriesRepository.findBySlug(slug);

        if (!existingCategory) {
            throw new BadRequestError("La categoría no existe o está inactiva");
        }

        return slug;
    }

    private createSlug(value: string): string {
        const slug = value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");

        if (!slug) {
            throw new BadRequestError("La categoría no permite generar un slug válido");
        }

        return slug;
    }

    private toObjectId(id: string): ObjectId {
        if (!ObjectId.isValid(id)) {
            throw new BadRequestError(`Identificador inválido: ${id}`);
        }
        return new ObjectId(id);
    }
}
