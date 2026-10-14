import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, CategoryWriteRequest, CustomerAdmin, Product, ProductCreateRequest, ProductImageUploadResponse, ProductUpdateRequest, UserCreateRequest, UserPublic, UserUpdateRequest } from '../models/api';

@Injectable({ providedIn: 'root' })
export class AdminService {
    private readonly apiUrl = `${environment.apiUrl}`;

    constructor(private readonly http: HttpClient) { }

    getDashboardSummary(): Observable<Record<string, unknown>> {
        return this.http.get<Record<string, unknown>>(`${this.apiUrl}/products`);
    }

    getProducts(): Observable<Product[]> {
        return this.http.get<Product[]>(`${this.apiUrl}/products`);
    }

    getUsers(): Observable<UserPublic[]> {
        return this.http.get<UserPublic[]>(`${this.apiUrl}/users`);
    }

    getUser(id: string): Observable<UserPublic> {
        return this.http.get<UserPublic>(`${this.apiUrl}/users/${id}`);
    }

    createUser(user: UserCreateRequest): Observable<UserPublic> {
        return this.http.post<UserPublic>(`${this.apiUrl}/users`, user);
    }

    updateUser(id: string, user: UserUpdateRequest): Observable<UserPublic> {
        return this.http.patch<UserPublic>(`${this.apiUrl}/users/${id}`, user);
    }

    deleteUser(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
    }

    getActiveCustomers(): Observable<CustomerAdmin[]> {
        return this.http.get<CustomerAdmin[]>(`${this.apiUrl}/customers/active`);
    }

    getCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(`${this.apiUrl}/categories`);
    }

    getAdminCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(`${this.apiUrl}/categories/all`);
    }

    createCategory(category: CategoryWriteRequest): Observable<Category> {
        return this.http.post<Category>(`${this.apiUrl}/categories`, category);
    }

    updateCategory(id: string, category: Partial<CategoryWriteRequest>): Observable<Category> {
        return this.http.patch<Category>(`${this.apiUrl}/categories/${id}`, category);
    }

    getProductBySlug(slug: string): Observable<Product> {
        return this.http.get<Product>(`${this.apiUrl}/products/slug/${encodeURIComponent(slug)}`);
    }

    uploadProductImages(files: File[]): Observable<ProductImageUploadResponse> {
        const formData = new FormData();
        files.forEach((file) => formData.append('images', file, file.name));
        return this.http.post<ProductImageUploadResponse>(`${this.apiUrl}/products/images`, formData);
    }

    updateProduct(id: string, product: ProductUpdateRequest): Observable<Product> {
        return this.http.patch<Product>(`${this.apiUrl}/products/${id}`, product);
    }

    deactivateCategory(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/categories/${id}`);
    }

    createProduct(product: ProductCreateRequest): Observable<Product> {
        return this.http.post<Product>(`${this.apiUrl}/products`, product);
    }
}
