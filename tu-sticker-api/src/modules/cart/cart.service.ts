import { ObjectId } from "mongodb";
import { BadRequestError, NotFoundError } from "../../shared/errors/AppError";
import { ProductsRepository } from "../products/products.repository";
import { AddCartItemInput, Cart, CartCustomization, CartItem, CartOwner, UpdateCartItemInput } from "./cart.model";
import { CartRepository } from "./cart.repository";
import { Product } from "../products/products.model";

export class CartService {
    private readonly cartRepository = new CartRepository();
    private readonly productsRepository = new ProductsRepository();

    async getCart(owner: CartOwner): Promise<Cart> {
        const existingCart = await this.findCart(owner);

        if (existingCart) {
            return existingCart;
        }

        return this.emptyCart(owner);
    }

    async addItem(owner: CartOwner, data: AddCartItemInput): Promise<Cart> {
        const productId = this.toObjectId(data.productId, "productId");
        const quantityToAdd = this.requireQuantity(data.quantity);
        const product = await this.getAvailableProduct(productId);
        const cart = await this.getOrCreateCart(owner);
        const customizationIds = this.resolveCustomizationIds(product, data.customizationIds);
        const item = this.createCartItem(product, quantityToAdd, customizationIds);
        const existingItem = cart.items.find((currentItem) => this.getLineId(currentItem) === item.lineId);
        const quantity = (existingItem?.quantity ?? 0) + quantityToAdd;
        this.validateStock(product, this.totalProductQuantity(cart.items, productId) + quantityToAdd);
        item.quantity = quantity;
        item.subtotal = this.calculateSubtotal(item.unitPrice, quantity);

        const items = existingItem
            ? cart.items.map((currentItem) =>
                  this.getLineId(currentItem) === item.lineId ? item : currentItem
              )
            : [...cart.items, item];

        return this.saveCart(cart, items);
    }

    async updateItem(owner: CartOwner, itemId: string, data: UpdateCartItemInput): Promise<Cart> {
        const quantity = this.requireQuantity(data.quantity);
        const cart = await this.getOrCreateCart(owner);
        const existingItem = cart.items.find((item) => this.getLineId(item) === itemId);
        if (!existingItem) {
            const legacyProductId = this.tryToObjectId(itemId);
            if (legacyProductId) {
                const matchingItems = cart.items.filter((item) => item.productId.equals(legacyProductId));
                if (matchingItems.length === 1) {
                    return this.updateItem(owner, this.getLineId(matchingItems[0]), data);
                }
            }
        }

        if (!existingItem) {
            throw new NotFoundError("El producto no está en el carrito");
        }

        const product = await this.getAvailableProduct(existingItem.productId);
        const otherQuantity = this.totalProductQuantity(cart.items, existingItem.productId) - existingItem.quantity;
        this.validateStock(product, otherQuantity + quantity);
        const refreshedItem = this.createCartItem(
            product,
            quantity,
            this.resolveCustomizationIds(product, existingItem.customizationIds),
        );

        const items = cart.items.map((item) =>
            this.getLineId(item) === itemId
                ? refreshedItem
                : item
        );

        return this.saveCart(cart, items);
    }

    async removeItem(owner: CartOwner, itemId: string): Promise<Cart> {
        const cart = await this.getOrCreateCart(owner);
        let items = cart.items.filter((item) => this.getLineId(item) !== itemId);
        if (items.length === cart.items.length) {
            const legacyProductId = this.tryToObjectId(itemId);
            if (legacyProductId) {
                items = cart.items.filter((item) => !item.productId.equals(legacyProductId));
            }
        }

        if (items.length === cart.items.length) {
            throw new NotFoundError("El producto no está en el carrito");
        }

        return this.saveCart(cart, items);
    }

    async clearCart(owner: CartOwner): Promise<Cart> {
        const cart = await this.getOrCreateCart(owner);
        return this.saveCart(cart, []);
    }

    async claimGuestCart(guestId: string, userId: string): Promise<Cart> {
        const guestCart = await this.cartRepository.findByGuestId(guestId);
        const userCart = await this.getOrCreateCart({ userId });

        if (!guestCart) {
            return userCart;
        }

        let items = [...userCart.items];
        for (const guestItem of guestCart.items) {
            const guestLineId = this.getLineId(guestItem);
            const restoredItem: CartItem = { ...guestItem, lineId: guestLineId };
            const existingItem = items.find((item) => this.getLineId(item) === guestLineId);
            const quantity = (existingItem?.quantity ?? 0) + guestItem.quantity;
            restoredItem.quantity = quantity;
            restoredItem.subtotal = this.calculateSubtotal(restoredItem.unitPrice, quantity);

            items = existingItem
                ? items.map((currentItem) =>
                      this.getLineId(currentItem) === guestLineId ? restoredItem : currentItem
                  )
                : [...items, restoredItem];
        }

        const savedCart = await this.saveCart(userCart, items);
        await this.cartRepository.deleteByGuestId(guestId);
        return savedCart;
    }

    private async getOrCreateCart(owner: CartOwner): Promise<Cart> {
        const existingCart = await this.findCart(owner);
        return existingCart ?? this.emptyCart(owner);
    }

    private async findCart(owner: CartOwner): Promise<Cart | null> {
        if (owner.userId) {
            return this.cartRepository.findByUserId(this.toObjectId(owner.userId));
        }

        if (owner.guestId) {
            return this.cartRepository.findByGuestId(owner.guestId);
        }

        throw new BadRequestError("No se identificó el propietario del carrito");
    }

    private async getAvailableProduct(productId: ObjectId) {
        const product = await this.productsRepository.findById(productId);

        if (!product || !product.isActive) {
            throw new NotFoundError("Producto no disponible");
        }

        return product;
    }

    private validateStock(product: { inventoryManaged?: boolean; stock?: number }, quantity: number): void {
        if (product.inventoryManaged && product.stock !== undefined && quantity > product.stock) {
            throw new BadRequestError("La cantidad solicitada supera el inventario disponible");
        }
    }

    private saveCart(cart: Cart, items: CartItem[]): Promise<Cart> {
        const subtotal = items.reduce((total, item) => total + item.subtotal, 0);
        const now = new Date();

        return this.cartRepository.save({
            ...(cart.userId ? { userId: cart.userId } : { guestId: cart.guestId }),
            items,
            subtotal,
            total: subtotal,
            createdAt: cart.createdAt,
            updatedAt: now,
        });
    }

    private emptyCart(owner: CartOwner): Cart {
        const now = new Date();
        return {
            ...(owner.userId ? { userId: this.toObjectId(owner.userId) } : { guestId: owner.guestId }),
            items: [],
            subtotal: 0,
            total: 0,
            createdAt: now,
            updatedAt: now,
        };
    }

    private requireQuantity(value: unknown): number {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
            throw new BadRequestError("La cantidad debe ser un número entero mayor que cero");
        }
        return value;
    }

    private calculateSubtotal(unitPrice: number, quantity: number): number {
        return unitPrice * quantity;
    }

    private resolveCustomizationIds(product: Product, values: unknown): number[] {
        const customizations = product.customizations ?? [];
        let selected: number[];

        if (values === undefined) {
            selected = customizations
                .map((customization, index) => customization.required ? index : -1)
                .filter((index) => index >= 0);
        } else {
            if (!Array.isArray(values) || values.some((value) => !Number.isInteger(value))) {
                throw new BadRequestError("Las opciones de personalización no son válidas");
            }
            selected = [...new Set(values as number[])].sort((left, right) => left - right);
            if (selected.some((index) => index < 0 || index >= customizations.length)) {
                throw new BadRequestError("Una de las opciones de personalización no existe");
            }
        }

        if (customizations.some((customization, index) => customization.required && !selected.includes(index))) {
            throw new BadRequestError("Debes seleccionar todas las opciones de personalización obligatorias");
        }
        if (product.customizationSelectionMode === "single" && selected.length > 1) {
            throw new BadRequestError("Este producto solo permite seleccionar una opción de personalización");
        }
        return selected;
    }

    private createCartItem(product: Product, quantity: number, customizationIds: number[]): CartItem {
        const customizations: CartCustomization[] = customizationIds.map((index) => {
            const customization = product.customizations?.[index];
            if (!customization) {
                throw new BadRequestError("Una de las opciones de personalización no existe");
            }
            return { index, name: customization.name, value: customization.value };
        });
        const unitPrice = product.price + customizations.reduce((total, customization) => total + customization.value, 0);
        const productId = product._id as ObjectId;

        return {
            productId,
            lineId: this.createLineId(productId, customizationIds),
            productName: product.name,
            productSlug: product.slug,
            quantity,
            unitPrice,
            subtotal: this.calculateSubtotal(unitPrice, quantity),
            customizationIds,
            customizations,
        };
    }

    private createLineId(productId: ObjectId, customizationIds: number[]): string {
        return `${productId.toHexString()}:${customizationIds.join(",")}`;
    }

    private getLineId(item: CartItem): string {
        return item.lineId ?? this.createLineId(item.productId, item.customizationIds ?? []);
    }

    private totalProductQuantity(items: CartItem[], productId: ObjectId): number {
        return items
            .filter((item) => item.productId.equals(productId))
            .reduce((total, item) => total + item.quantity, 0);
    }

    private tryToObjectId(value: string): ObjectId | null {
        return ObjectId.isValid(value) ? new ObjectId(value) : null;
    }

    private toObjectId(value: unknown, field = "id"): ObjectId {
        if (typeof value !== "string" || !ObjectId.isValid(value)) {
            throw new BadRequestError(`Identificador inválido: ${value ?? field}`);
        }
        return new ObjectId(value);
    }
}
