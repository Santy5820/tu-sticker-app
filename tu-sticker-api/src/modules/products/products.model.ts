import { ObjectId } from "mongodb";

export type ProductCustomizationInputType = "none" | "text" | "file";
export type ProductCustomizationSelectionMode = "single" | "multiple";

export interface ProductCustomization {
    name: string;
    value: number;
    inputType: ProductCustomizationInputType;
    required: boolean;
}

export interface Product {
    _id?: ObjectId;
    name: string;
    slug: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    isActive: boolean;
    isCustomizable: boolean;
    customizationSelectionMode?: ProductCustomizationSelectionMode;
    customizations?: ProductCustomization[];
    inventoryManaged?: boolean;
    stock?: number;
    stockAlertThreshold?: number;
    requiresSupplierFallback?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductCreateInput {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    images?: string[];
    isActive?: boolean;
    isCustomizable?: boolean;
    customizationSelectionMode?: ProductCustomizationSelectionMode;
    customizations?: ProductCustomization[];
    inventoryManaged?: boolean;
    stock?: number;
    stockAlertThreshold?: number;
    requiresSupplierFallback?: boolean;
}

export type ProductUpdateInput = Partial<ProductCreateInput>;
