import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <section class="page">
      <h1>Panel administrativo</h1>

      <div class="cards">
        <a routerLink="/admin/products" class="card">Productos</a>
        <a routerLink="/admin/orders" class="card">Pedidos</a>
        <a routerLink="/admin/users" class="card">Usuarios</a>
      </div>
    </section>
  `,
    styles: [
        `.page { padding: 2rem; } .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-top: 1.5rem; } .card { display: grid; place-items: center; min-height: 140px; background: linear-gradient(135deg, #111827 0%, #1f2937 100%); color: white; border-radius: 18px; text-decoration: none; font-weight: 700; }`],
})
export class AdminDashboardComponent { }
