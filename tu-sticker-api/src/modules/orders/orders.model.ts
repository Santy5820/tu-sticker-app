import { ObjectId } from "mongodb";

export type OrderStatus =
    | "PENDING_PAYMENT"
    | "CONFIRMED"
    | "IN_PRODUCTION"
    | "READY"
    | "DELIVERED"
    | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "CANCELLED";
export type OrderPaymentMethod = "WOMPI" | "WHATSAPP_DEPOSIT";

export interface OrderAddress {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    alias?: string;
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
}

export interface OrderItem {
    productId: ObjectId;
    productName: string;
    productSlug: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    customizations?: Array<{ name: string; value: number }>;
}

export interface Order {
    _id?: ObjectId;
    orderNumber: string;
    userId: ObjectId;
    customerId: ObjectId;
    items: OrderItem[];
    address: OrderAddress;
    subtotal: number;
    total: number;
    paymentMethod?: OrderPaymentMethod;
    amountDueNow?: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderCreateInput {
    addressIndex?: number;
    address?: Partial<OrderAddress>;
    saveAddress?: boolean;
    paymentMethod?: OrderPaymentMethod;
}

export interface OrderStatusInput {
    status?: OrderStatus;
}

export interface OrderAdminUpdateInput {
    customerId?: string;
    items?: Array<{
        productId?: string;
        quantity?: number;
        unitPrice?: number;
        customizations?: Array<{ name?: string; value?: number }>;
    }>;
    address?: Partial<OrderAddress>;
    paymentMethod?: OrderPaymentMethod;
    amountDueNow?: number;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
}

export interface OrderAdminFilters {
    status?: string;
    name?: string;
    month?: string;
    from?: string;
    to?: string;
}
