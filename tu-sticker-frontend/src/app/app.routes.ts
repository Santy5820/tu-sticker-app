import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { CartPageComponent } from './features/cart/cart-page/cart-page.component';
import { CategoriesAdminComponent } from './features/admin/categories/categories-admin.component';
import { AdminDashboardComponent } from './features/admin/dashboard/dashboard.component';
import { OrdersAdminComponent } from './features/admin/orders/orders-admin.component';
import { ProductsAdminComponent } from './features/admin/products/products-admin.component';
import { UsersAdminComponent } from './features/admin/users/users-admin.component';
import { OrdersPageComponent } from './features/orders/orders-page/orders-page.component';
import { ProductDetailComponent } from './features/shop/product-detail/product-detail.component';
import { ProductListComponent } from './features/shop/product-list/product-list.component';
import { ShopHomeComponent } from './features/shop/shop-home/shop-home.component';

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
        path: 'products/:id',
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
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        children: [
            { path: '', component: AdminDashboardComponent },
            { path: 'products', component: ProductsAdminComponent },
            { path: 'categories', component: CategoriesAdminComponent },
            { path: 'orders', component: OrdersAdminComponent },
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
