import { randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import { env } from "../../config/env";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors/AppError";
import { CartRepository } from "../cart/cart.repository";
import { Customer, CustomerAddress } from "../customers/customers.model";
import { CustomersRepository } from "../customers/customers.repository";
import { InventoryRepository } from "../inventory/inventory.repository";
import { Product } from "../products/products.model";
import { ProductsRepository } from "../products/products.repository";
import {
    Order,
    OrderAdminUpdateInput,
    OrderAddress,
    OrderCreateInput,
    OrderAdminFilters,
    OrderItem,
    OrderPaymentMethod,
    OrderStatus,
    OrderStatusInput,
} from "./orders.model";
import { OrdersRepository } from "./orders.repository";

export class OrdersService {
    private readonly ordersRepository = new OrdersRepository();
    private readonly cartRepository = new CartRepository();
    private readonly customersRepository = new CustomersRepository();
    private readonly productsRepository = new ProductsRepository();
    private readonly inventoryRepository = new InventoryRepository();

    async create(userId: string, data: OrderCreateInput = {}): Promise<Order> {
        const userObjectId = this.toObjectId(userId, "userId");
        const customer = await this.getCustomer(userObjectId);
        const cart = await this.cartRepository.findByUserId(userObjectId);
        const paymentMethod = this.requirePaymentMethod(data.paymentMethod);
        this.validatePaymentMethodAvailability(paymentMethod);

        if (!cart || cart.items.length === 0) {
            throw new BadRequestError("No puedes crear un pedido con el carrito vacío");
        }

        const address = await this.resolveAddress(customer, data);
        const orderNumber = this.createOrderNumber();
        const stockChanges: Array<{ product: Product; previousStock: number | undefined; newStock: number }> = [];

        try {
            const items: OrderItem[] = [];

            for (const cartItem of cart.items) {
                const product = await this.getAvailableProduct(cartItem.productId);
                const customizationIds = cartItem.customizationIds ?? (product.customizations ?? [])
                    .map((customization, index) => customization.required ? index : -1)
                    .filter((index) => index >= 0);
                const customizations = customizationIds.map((index) => {
                    const customization = product.customizations?.[index];
                    if (!customization) {
                        throw new BadRequestError(`Una opción de personalización de '${product.name}' ya no está disponible`);
                    }
                    return { name: customization.name, value: customization.value };
                });
                const unitPrice = product.price + customizations.reduce((total, customization) => total + customization.value, 0);
                const item: OrderItem = {
                    productId: product._id as ObjectId,
                    productName: product.name,
                    productSlug: product.slug,
                    quantity: cartItem.quantity,
                    unitPrice,
                    subtotal: unitPrice * cartItem.quantity,
                    ...(customizations.length ? { customizations } : {}),
                };
                items.push(item);

                if (product.inventoryManaged) {
                    const previousStock = product.stock;
                    const currentStock = product.stock ?? 0;
                    const newStock = currentStock - cartItem.quantity;

                    if (newStock < 0) {
                        throw new BadRequestError(`Stock insuficiente para el producto '${product.name}'`);
                    }

                    const updatedProduct = await this.productsRepository.updateStock(
                        product._id as ObjectId,
                        previousStock,
                        newStock
                    );

                    if (!updatedProduct) {
                        throw new BadRequestError(
                            `El stock de '${product.name}' cambió durante la operación; intenta nuevamente`
                        );
                    }

                    stockChanges.push({ product, previousStock, newStock });
                    await this.inventoryRepository.createMovement({
                        productId: product._id as ObjectId,
                        type: "OUT",
                        quantity: cartItem.quantity,
                        previousStock: currentStock,
                        newStock,
                        reason: `Pedido ${orderNumber}`,
                        reference: orderNumber,
                        createdBy: userObjectId,
                        createdAt: new Date(),
                    });
                }
            }

            const subtotal = items.reduce((total, item) => total + item.subtotal, 0);
            const now = new Date();
            const order = await this.ordersRepository.create({
                orderNumber,
                userId: userObjectId,
                customerId: customer._id as ObjectId,
                items,
                address,
                subtotal,
                total: subtotal,
                paymentMethod,
                amountDueNow: paymentMethod === "WHATSAPP_DEPOSIT" ? Math.ceil(subtotal / 2) : subtotal,
                status: "PENDING_PAYMENT",
                paymentStatus: "PENDING",
                createdAt: now,
                updatedAt: now,
            });

            await this.cartRepository.save({
                userId: userObjectId,
                items: [],
                subtotal: 0,
                total: 0,
                createdAt: cart.createdAt,
                updatedAt: new Date(),
            });

            return order;
        } catch (error: unknown) {
            await this.rollbackStock(stockChanges, userObjectId, orderNumber);
            throw error;
        }
    }

    async findMine(userId: string): Promise<Order[]> {
        return this.ordersRepository.findByUserId(this.toObjectId(userId, "userId"));
    }

    async findAll(filters: OrderAdminFilters = {}): Promise<Order[]> {
        const status = filters.status === undefined ? undefined : this.requireStatus(filters.status);
        const nameTerms = filters.name?.trim().split(/\s+/).filter(Boolean) ?? [];
        const from = filters.from ? this.parseDate(filters.from, "from") : undefined;
        const to = filters.to ? this.parseDate(filters.to, "to") : undefined;
        let createdFrom = from;
        let createdBefore = to ? this.addUtcDays(to, 1) : undefined;

        if (filters.month) {
            const monthMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(filters.month);
            if (!monthMatch) {
                throw new BadRequestError("El mes debe tener el formato YYYY-MM");
            }
            const year = Number(monthMatch[1]);
            const monthIndex = Number(monthMatch[2]) - 1;
            const monthStart = new Date(Date.UTC(year, monthIndex, 1));
            const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 1));
            if (!createdFrom || monthStart > createdFrom) createdFrom = monthStart;
            if (!createdBefore || monthEnd < createdBefore) createdBefore = monthEnd;
        }

        if (createdFrom && createdBefore && createdFrom >= createdBefore) {
            throw new BadRequestError("El rango de fechas seleccionado no es válido");
        }

        return this.ordersRepository.findAll({
            status,
            nameTerms,
            createdFrom,
            createdBefore,
        });
    }

    async findById(id: string, userId?: string): Promise<Order> {
        const order = await this.ordersRepository.findById(this.toObjectId(id));
        if (!order) {
            throw new NotFoundError("Pedido no encontrado");
        }

        if (userId && !order.userId.equals(this.toObjectId(userId, "userId"))) {
            throw new ForbiddenError("No puedes consultar este pedido");
        }

        return order;
    }

    async updateStatus(id: string, data: OrderStatusInput): Promise<Order> {
        const order = await this.findById(id);
        const nextStatus = this.requireStatus(data.status);
        this.validateTransition(order.status, nextStatus);

        if (nextStatus === "CANCELLED") {
            return this.cancelOrder(order);
        }

        const updated = await this.ordersRepository.updateStatus(
            order._id as ObjectId,
            nextStatus,
            order.paymentStatus
        );
        if (!updated) {
            throw new NotFoundError("Pedido no encontrado");
        }
        return updated;
    }

    async updateAdmin(id: string, data: OrderAdminUpdateInput, actorId: string): Promise<Order> {
        const order = await this.findById(id);
        const customerId = data.customerId
            ? this.toObjectId(data.customerId, "customerId")
            : order.customerId;
        const customer = await this.customersRepository.findById(customerId);
        const customerChanged = !customerId.equals(order.customerId);
        if (!customer || (customerChanged && !customer.isActive) || !customer.userId) {
            throw new BadRequestError("El pedido debe estar asociado a un cliente activo con cuenta");
        }

        const items = data.items === undefined
            ? order.items
            : await this.normalizeAdminItems(data.items);
        if (items.length === 0) {
            throw new BadRequestError("El pedido debe contener al menos un producto");
        }

        const subtotal = items.reduce((total, item) => total + item.subtotal, 0);
        if (!Number.isFinite(subtotal) || subtotal < 0) {
            throw new BadRequestError("El total del pedido no es válido");
        }
        const total = subtotal;
        const paymentMethod = data.paymentMethod === undefined
            ? (order.paymentMethod ?? "WOMPI")
            : this.requirePaymentMethod(data.paymentMethod);
        const paymentStatus = data.paymentStatus === undefined
            ? order.paymentStatus
            : this.requirePaymentStatus(data.paymentStatus);
        const amountDueNow = data.amountDueNow === undefined
            ? (order.amountDueNow ?? total)
            : this.requireNonNegativeNumber(data.amountDueNow, "amountDueNow");
        if (amountDueNow > total) {
            throw new BadRequestError("El valor por cobrar ahora no puede superar el total del pedido");
        }

        const status = data.status === undefined ? order.status : this.requireStatus(data.status);
        const address = this.normalizeAdminAddress(
            data.address ?? {},
            order.address,
            customer,
            customerChanged
        );
        const updatedOrder: Order = {
            ...order,
            userId: customer.userId,
            customerId,
            items,
            address,
            subtotal,
            total,
            paymentMethod,
            amountDueNow,
            status,
            paymentStatus,
            updatedAt: new Date(),
        };
        const stockChanges: Array<{
            product: Product;
            previousStock: number | undefined;
            newStock: number;
        }> = [];
        const actorObjectId = this.toObjectId(actorId, "actorId");

        try {
            await this.reconcileOrderInventory(order, updatedOrder, actorObjectId, stockChanges);
            const savedOrder = await this.ordersRepository.updateAdmin(
                order._id as ObjectId,
                order.updatedAt,
                {
                    userId: updatedOrder.userId,
                    customerId: updatedOrder.customerId,
                    items: updatedOrder.items,
                    address: updatedOrder.address,
                    subtotal: updatedOrder.subtotal,
                    total: updatedOrder.total,
                    paymentMethod: updatedOrder.paymentMethod,
                    amountDueNow: updatedOrder.amountDueNow,
                    status: updatedOrder.status,
                    paymentStatus: updatedOrder.paymentStatus,
                }
            );
            if (!savedOrder) {
                throw new BadRequestError("El pedido cambió durante la edición; recarga e inténtalo nuevamente");
            }
            return savedOrder;
        } catch (error: unknown) {
            await this.rollbackStock(stockChanges, actorObjectId, order.orderNumber);
            throw error;
        }
    }

    async cancel(id: string, userId: string, isAdmin = false): Promise<Order> {
        const order = await this.findById(id, isAdmin ? undefined : userId);
        if (order.status !== "PENDING_PAYMENT" && order.status !== "CONFIRMED") {
            throw new BadRequestError("El pedido ya no puede cancelarse en su estado actual");
        }
        return this.cancelOrder(order);
    }

    private async cancelOrder(order: Order): Promise<Order> {
        const stockChanges: Array<{ product: Product; previousStock: number | undefined; newStock: number }> = [];

        try {
            for (const item of order.items) {
                const product = await this.productsRepository.findById(item.productId);
                if (!product?.inventoryManaged) continue;

                const previousStock = product.stock;
                const currentStock = product.stock ?? 0;
                const newStock = currentStock + item.quantity;
                const updatedProduct = await this.productsRepository.updateStock(
                    item.productId,
                    previousStock,
                    newStock
                );

                if (!updatedProduct) {
                    throw new BadRequestError(
                        `El stock de '${item.productName}' cambió durante la cancelación; intenta nuevamente`
                    );
                }

                stockChanges.push({ product, previousStock, newStock });
                await this.inventoryRepository.createMovement({
                    productId: item.productId,
                    type: "IN",
                    quantity: item.quantity,
                    previousStock: currentStock,
                    newStock,
                    reason: `Reintegro por cancelación del pedido ${order.orderNumber}`,
                    reference: order.orderNumber,
                    createdBy: order.userId,
                    createdAt: new Date(),
                });
            }

            const updated = await this.ordersRepository.updateStatus(
                order._id as ObjectId,
                "CANCELLED",
                "CANCELLED"
            );
            if (!updated) {
                throw new NotFoundError("Pedido no encontrado");
            }
            return updated;
        } catch (error: unknown) {
            await this.rollbackStock(stockChanges, order.userId, order.orderNumber);
            throw error;
        }
    }

    private async normalizeAdminItems(
        input: NonNullable<OrderAdminUpdateInput["items"]>
    ): Promise<OrderItem[]> {
        if (!Array.isArray(input)) {
            throw new BadRequestError("Los productos del pedido deben enviarse como una lista");
        }

        const items: OrderItem[] = [];
        for (const [index, item] of input.entries()) {
            const productId = this.toObjectId(item.productId ?? "", `items[${index}].productId`);
            const product = await this.productsRepository.findById(productId);
            if (!product) {
                throw new NotFoundError(`No se encontró el producto de la línea ${index + 1}`);
            }
            const quantity = this.requirePositiveInteger(item.quantity, `items[${index}].quantity`);
            const unitPrice = this.requireNonNegativeNumber(item.unitPrice, `items[${index}].unitPrice`);
            const customizations = this.normalizeAdminCustomizations(item.customizations, index);
            const subtotal = unitPrice * quantity;
            if (!Number.isFinite(subtotal)) {
                throw new BadRequestError(`El subtotal de la línea ${index + 1} no es válido`);
            }
            items.push({
                productId,
                productName: product.name,
                productSlug: product.slug,
                quantity,
                unitPrice,
                subtotal,
                ...(customizations.length ? { customizations } : {}),
            });
        }
        return items;
    }

    private normalizeAdminCustomizations(
        value: NonNullable<OrderAdminUpdateInput["items"]>[number]["customizations"],
        itemIndex: number
    ): Array<{ name: string; value: number }> {
        if (value === undefined) return [];
        if (!Array.isArray(value)) {
            throw new BadRequestError(`Las personalizaciones de la línea ${itemIndex + 1} no son válidas`);
        }
        return value.map((customization, customizationIndex) => ({
            name: this.requireString(customization.name, `items[${itemIndex}].customizations[${customizationIndex}].name`),
            value: this.requireNonNegativeNumber(
                customization.value,
                `items[${itemIndex}].customizations[${customizationIndex}].value`
            ),
        }));
    }

    private normalizeAdminAddress(
        changes: Partial<OrderAddress>,
        previous: OrderAddress,
        customer: Customer,
        customerChanged: boolean
    ): OrderAddress {
        return {
            firstName: this.requireString(changes.firstName ?? (customerChanged ? customer.firstName : previous.firstName), "address.firstName"),
            lastName: this.requireString(changes.lastName ?? (customerChanged ? customer.lastName : previous.lastName), "address.lastName"),
            email: this.requireString(changes.email ?? (customerChanged ? customer.email : previous.email), "address.email").toLowerCase(),
            phone: this.optionalString(changes.phone ?? (customerChanged ? customer.phone : previous.phone)),
            alias: this.optionalString(changes.alias ?? previous.alias),
            street: this.requireString(changes.street ?? previous.street, "address.street"),
            city: this.requireString(changes.city ?? previous.city, "address.city"),
            state: this.requireString(changes.state ?? previous.state, "address.state"),
            postalCode: this.optionalString(changes.postalCode ?? previous.postalCode),
            country: this.requireString(changes.country ?? previous.country, "address.country"),
        };
    }

    private async reconcileOrderInventory(
        previous: Order,
        next: Order,
        actorId: ObjectId,
        changes: Array<{ product: Product; previousStock: number | undefined; newStock: number }>
    ): Promise<void> {
        const previousCounts = this.orderQuantitiesByProduct(previous);
        const nextCounts = this.orderQuantitiesByProduct(next);
        const productIds = new Set([...previousCounts.keys(), ...nextCounts.keys()]);
        const stockReservedBefore = previous.status !== "CANCELLED";
        const stockReservedAfter = next.status !== "CANCELLED";

        for (const productId of productIds) {
            const before = stockReservedBefore ? previousCounts.get(productId) ?? 0 : 0;
            const after = stockReservedAfter ? nextCounts.get(productId) ?? 0 : 0;
            const delta = after - before;
            if (delta === 0) continue;

            const productObjectId = this.toObjectId(productId, "productId");
            const product = await this.productsRepository.findById(productObjectId);
            if (!product) {
                throw new NotFoundError("No se encontró un producto necesario para ajustar el inventario");
            }
            if (!product.inventoryManaged) continue;

            const previousStock = product.stock;
            const currentStock = previousStock ?? 0;
            const newStock = currentStock - delta;
            if (newStock < 0) {
                throw new BadRequestError(`Stock insuficiente para el producto '${product.name}'`);
            }
            const updatedProduct = await this.productsRepository.updateStock(
                productObjectId,
                previousStock,
                newStock
            );
            if (!updatedProduct) {
                throw new BadRequestError(`El stock de '${product.name}' cambió durante la edición; inténtalo nuevamente`);
            }

            changes.push({ product, previousStock, newStock });
            await this.inventoryRepository.createMovement({
                productId: productObjectId,
                type: delta > 0 ? "OUT" : "IN",
                quantity: Math.abs(delta),
                previousStock: currentStock,
                newStock,
                reason: `Edición del pedido ${next.orderNumber}`,
                reference: next.orderNumber,
                createdBy: actorId,
                createdAt: new Date(),
            });
        }
    }

    private orderQuantitiesByProduct(order: Order): Map<string, number> {
        const quantities = new Map<string, number>();
        for (const item of order.items) {
            const productId = item.productId.toString();
            quantities.set(productId, (quantities.get(productId) ?? 0) + item.quantity);
        }
        return quantities;
    }

    private async resolveAddress(customer: Customer, data: OrderCreateInput): Promise<OrderAddress> {
        let address: CustomerAddress | Partial<OrderAddress> | undefined;

        if (data.addressIndex !== undefined) {
            if (!Number.isInteger(data.addressIndex) || data.addressIndex < 0) {
                throw new BadRequestError("addressIndex debe ser un entero mayor o igual a cero");
            }
            address = customer.addresses[data.addressIndex];
            if (!address) {
                throw new BadRequestError("La dirección seleccionada no existe");
            }
        } else {
            address = data.address;
            if (!address) {
                throw new BadRequestError(
                    "Debes seleccionar una dirección guardada o enviar una nueva dirección"
                );
            }
        }

        const normalizedAddress = this.normalizeAddress(address, customer);

        if (data.addressIndex === undefined && data.saveAddress === true) {
            const isDuplicate = customer.addresses.some((savedAddress) =>
                this.addressComparisonKey(savedAddress) === this.addressComparisonKey(normalizedAddress)
            );
            if (!isDuplicate) {
                const savedAddress: CustomerAddress = {
                    alias: normalizedAddress.alias,
                    street: normalizedAddress.street,
                    city: normalizedAddress.city,
                    state: normalizedAddress.state,
                    postalCode: normalizedAddress.postalCode,
                    country: normalizedAddress.country,
                    isDefault: customer.addresses.length === 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                const updatedCustomer = await this.customersRepository.update(customer._id as ObjectId, {
                    addresses: [...customer.addresses, savedAddress],
                });
                if (!updatedCustomer) {
                    throw new NotFoundError("No se encontró el cliente para guardar la dirección");
                }
            }
        }

        return normalizedAddress;
    }

    private addressComparisonKey(address: Pick<CustomerAddress, "street" | "city" | "state" | "postalCode" | "country">): string {
        const normalizedFields = [
            address.street,
            address.city,
            address.state,
            address.postalCode,
            address.country,
        ].map((value) => (value ?? "")
            .trim()
            .replace(/\s+/g, " ")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
        );
        return JSON.stringify(normalizedFields);
    }

    private normalizeAddress(
        address: CustomerAddress | Partial<OrderAddress>,
        customer: Customer
    ): OrderAddress {
        return {
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            alias: this.optionalString(address.alias),
            street: this.requireString(address.street, "address.street"),
            city: this.requireString(address.city, "address.city"),
            state: this.requireString(address.state, "address.state"),
            postalCode: this.optionalString(address.postalCode),
            country: this.requireString(address.country, "address.country"),
        };
    }

    private async getCustomer(userId: ObjectId): Promise<Customer> {
        const customer = await this.customersRepository.findByUserId(userId);
        if (!customer) {
            throw new BadRequestError("El usuario no tiene un cliente activo asociado");
        }
        return customer;
    }

    private async getAvailableProduct(productId: ObjectId): Promise<Product> {
        const product = await this.productsRepository.findById(productId);
        if (!product || !product.isActive) {
            throw new BadRequestError("Uno de los productos del carrito ya no está disponible");
        }
        return product;
    }

    private async rollbackStock(
        changes: Array<{ product: Product; previousStock: number | undefined; newStock: number }>,
        userId: ObjectId,
        orderNumber: string
    ): Promise<void> {
        for (const change of changes.reverse()) {
            const restored = await this.productsRepository.updateStock(
                change.product._id as ObjectId,
                change.newStock,
                change.previousStock ?? 0
            );
            if (restored) {
                await this.inventoryRepository.createMovement({
                    productId: change.product._id as ObjectId,
                    type: change.newStock > (change.previousStock ?? 0) ? "OUT" : "IN",
                    quantity: Math.abs(change.newStock - (change.previousStock ?? 0)),
                    previousStock: change.newStock,
                    newStock: change.previousStock ?? 0,
                    reason: `Reversión de operación del pedido ${orderNumber}`,
                    reference: orderNumber,
                    createdBy: userId,
                    createdAt: new Date(),
                });
            }
        }
    }

    private createOrderNumber(): string {
        return `TS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID()
            .slice(0, 8)
            .toUpperCase()}`;
    }

    private validateTransition(current: OrderStatus, next: OrderStatus): void {
        const transitions: Record<OrderStatus, OrderStatus[]> = {
            PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
            CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
            IN_PRODUCTION: ["READY"],
            READY: ["DELIVERED"],
            DELIVERED: [],
            CANCELLED: [],
        };
        if (!transitions[current].includes(next)) {
            throw new BadRequestError(`No se puede cambiar un pedido de ${current} a ${next}`);
        }
    }

    private requireStatus(value: unknown): OrderStatus {
        const statuses: OrderStatus[] = [
            "PENDING_PAYMENT",
            "CONFIRMED",
            "IN_PRODUCTION",
            "READY",
            "DELIVERED",
            "CANCELLED",
        ];
        if (typeof value !== "string" || !statuses.includes(value as OrderStatus)) {
            throw new BadRequestError("El estado del pedido no es válido");
        }
        return value as OrderStatus;
    }

    private requirePaymentMethod(value: unknown): OrderPaymentMethod {
        if (value === undefined || value === "WOMPI") return "WOMPI";
        if (value === "WHATSAPP_DEPOSIT") return value;
        throw new BadRequestError("El método de pago seleccionado no es válido");
    }

    private requirePaymentStatus(value: unknown): Order["paymentStatus"] {
        if (value === "PENDING" || value === "PAID" || value === "CANCELLED") return value;
        throw new BadRequestError("El estado del pago no es válido");
    }

    private requirePositiveInteger(value: unknown, field: string): number {
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
            throw new BadRequestError(`El campo '${field}' debe ser un entero positivo`);
        }
        return value;
    }

    private requireNonNegativeNumber(value: unknown, field: string): number {
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
            throw new BadRequestError(`El campo '${field}' debe ser un número no negativo`);
        }
        return value;
    }

    private parseDate(value: string, field: string): Date {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!match) {
            throw new BadRequestError(`El campo '${field}' debe tener el formato YYYY-MM-DD`);
        }
        const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
        if (
            date.getUTCFullYear() !== Number(match[1]) ||
            date.getUTCMonth() !== Number(match[2]) - 1 ||
            date.getUTCDate() !== Number(match[3])
        ) {
            throw new BadRequestError(`El campo '${field}' no contiene una fecha válida`);
        }
        return date;
    }

    private addUtcDays(date: Date, days: number): Date {
        const result = new Date(date);
        result.setUTCDate(result.getUTCDate() + days);
        return result;
    }

    private validatePaymentMethodAvailability(method: OrderPaymentMethod): void {
        if (method === "WOMPI" && (
            !env.wompiEnabled ||
            !env.wompiPublicKey ||
            !env.wompiIntegritySecret
        )) {
            throw new BadRequestError("El pago con Wompi no está disponible; selecciona otro método de pago");
        }
        if (method === "WHATSAPP_DEPOSIT" && !env.whatsappAdvisorNumber.replace(/\D/g, "")) {
            throw new BadRequestError("El abono por WhatsApp no está disponible en este momento");
        }
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== "string" || value.trim() === "") {
            throw new BadRequestError(`El campo '${field}' es obligatorio y debe ser texto no vacío`);
        }
        return value.trim();
    }

    private optionalString(value: unknown): string | undefined {
        return typeof value === "string" && value.trim() ? value.trim() : undefined;
    }

    private toObjectId(value: string, field = "id"): ObjectId {
        if (!ObjectId.isValid(value)) {
            throw new BadRequestError(`Identificador inválido para ${field}: ${value}`);
        }
        return new ObjectId(value);
    }
}
