import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
    selector: 'app-users-admin',
    standalone: true,
    imports: [CommonModule],
    template: `
    <section class="page">
      <h1>Usuarios</h1>
      <p>Administración de roles, accesos y clientes.</p>
    </section>
  `,
    styles: [`.page { padding: 2rem; } p { color: #475569; }`],
})
export class UsersAdminComponent { }
