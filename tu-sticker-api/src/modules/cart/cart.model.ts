import { ObjectId } from "mongodb";

export interface CartItem {
    productId: ObjectId;
    lineId?: string;
    productName: string;
    productSlug: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    customizationIds?: number[];
    customizations?: CartCustomization[];
}

export interface CartCustomization {
    index: number;
    name: string;
    value: number;
}

export interface Cart {
    _id?: ObjectId;
    userId?: ObjectId;
    guestId?: string;
    items: CartItem[];
    subtotal: number;
    total: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CartOwner {
    userId?: string;
    guestId?: string;
}

export interface AddCartItemInput {
    productId?: string;
    quantity?: number;
    customizationIds?: number[];
}

export interface UpdateCartItemInput {
    quantity?: number;
}
