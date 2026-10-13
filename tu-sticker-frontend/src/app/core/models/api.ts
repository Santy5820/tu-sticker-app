export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SALES' | 'DESIGNER' | 'PRODUCTION';

export interface UserPublic {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    customerId?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AuthResponse {
    user: UserPublic;
    token: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    phone?: string;
    customerId?: string;
    address?: Record<string, unknown>;
}

export interface Product {
    _id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    isActive: boolean;
    isCustomizable: boolean;
    customizationSelectionMode?: 'single' | 'multiple';
    customizations?: ProductCustomization[];
    inventoryManaged?: boolean;
    stock?: number | null;
    stockAlertThreshold?: number;
    requiresSupplierFallback?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type ProductCustomizationInputType = 'none' | 'text' | 'file';

export interface ProductCustomization {
    name: string;
    value: number;
    inputType: ProductCustomizationInputType;
    required: boolean;
}

export interface ProductCreateRequest {
    name: string;
    description: string;
    price: number;
    category: string;
    images?: string[];
    isCustomizable: boolean;
    customizationSelectionMode?: 'single' | 'multiple';
    customizations?: ProductCustomization[];
}

export interface ProductUpdateRequest {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    images?: string[];
    isActive?: boolean;
    isCustomizable?: boolean;
    customizationSelectionMode?: 'single' | 'multiple';
    customizations?: ProductCustomization[];
    inventoryManaged?: boolean;
    stockAlertThreshold?: number;
    requiresSupplierFallback?: boolean;
}

export interface ProductImageUploadResponse {
    images: string[];
}

export interface Category {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CategoryWriteRequest {
    name: string;
    description?: string;
    isActive?: boolean;
}

export interface CartItem {
    productId: string;
    productName: string;
    productSlug: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface Cart {
    _id: string;
    userId?: string;
    guestId?: string;
    items: CartItem[];
    subtotal: number;
    total: number;
    createdAt: string;
    updatedAt: string;
}

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
    productId: string;
    productName: string;
    productSlug: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface Order {
    _id: string;
    orderNumber: string;
    userId: string;
    customerId: string;
    items: OrderItem[];
    address: OrderAddress;
    subtotal: number;
    total: number;
    status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'DELIVERED' | 'CANCELLED';
    paymentStatus: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
    createdAt: string;
    updatedAt: string;
}

export interface ApiError {
    status?: string;
    message: string;
    stack?: string;
}
