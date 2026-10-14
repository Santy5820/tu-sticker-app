import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { CartPageComponent } from './features/cart/cart-page/cart-page.component';
import { AdminShellComponent } from './features/admin/admin-shell/admin-shell.component';
import { CategoriesAdminComponent } from './features/admin/categories/categories-admin.component';
import { AdminDashboardComponent } from './features/admin/dashboard/dashboard.component';
import { ProductsAdminComponent } from './features/admin/products/products-admin.component';
import { ProductCreateAdminComponent } from './features/admin/products/product-create-admin.component';
import { ProductEditorAdminComponent } from './features/admin/products/product-editor-admin.component';
import { UsersAdminComponent } from './features/admin/users/users-admin.component';
import { adminUserResolver, UserEditorAdminComponent } from './features/admin/users/user-editor-admin.component';
import { OrdersPageComponent } from './features/orders/orders-page/orders-page.component';
import { ProductDetailComponent } from './features/shop/product-detail/product-detail.component';
import { ProductListComponent } from './features/shop/product-list/product-list.component';
import { ShopHomeComponent } from './features/shop/shop-home/shop-home.component';
import { Order } from './core/models/api';
import { OrderService } from './core/services/order.service';

const adminOrderResolver: ResolveFn<Order> = (route) =>
    inject(OrderService).getById(route.paramMap.get('id') ?? '');

export const routes: Routes = [
    {
        path: 'login',
        component: LoginComponent,
    },
    {
        path: 'register',
        component: RegisterComponent,
    },
    {
        path: 'shop',
        component: ShopHomeComponent,
    },
    {
        path: 'products',
        component: ProductListComponent,
    },
    {
        path: 'products/:slug',
        component: ProductDetailComponent,
    },
    {
        path: 'cart',
        component: CartPageComponent,
    },
    {
        path: 'orders',
        component: OrdersPageComponent,
        canActivate: [authGuard],
    },
    {
        path: 'admin',
        component: AdminShellComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        children: [
            { path: '', component: AdminDashboardComponent },
            { path: 'products', component: ProductsAdminComponent },
            { path: 'products/new', component: ProductCreateAdminComponent },
            { path: 'products/:slug', component: ProductEditorAdminComponent },
            { path: 'categories', component: CategoriesAdminComponent },
            {
                path: 'orders',
                loadComponent: () => import('./features/admin/orders/orders-admin.component')
                    .then((module) => module.OrdersAdminComponent),
            },
            {
                path: 'orders/:id',
                loadComponent: () => import('./features/admin/orders/order-editor-admin.component')
                    .then((module) => module.OrderEditorAdminComponent),
                resolve: { order: adminOrderResolver },
            },
            {
                path: 'users/new',
                component: UserEditorAdminComponent,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['ADMIN'], mode: 'create' },
            },
            {
                path: 'users/:id',
                component: UserEditorAdminComponent,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['ADMIN'] },
                resolve: { user: adminUserResolver },
            },
            { path: 'users', component: UsersAdminComponent },
        ],
    },
    {
        path: '',
        redirectTo: '/shop',
        pathMatch: 'full',
    },
    {
        path: '**',
        redirectTo: '/shop',
    },
];
