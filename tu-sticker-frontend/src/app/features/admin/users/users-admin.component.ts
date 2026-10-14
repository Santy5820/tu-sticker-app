import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserPublic, UserRole } from '../../../core/models/api';
import { AdminService } from '../../../core/services/admin.service';

@Component({
    selector: 'app-users-admin',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <section class="page">
      <div class="page-heading">
        <div>
          <h1>Usuarios</h1>
          <p>Consulta la información y los roles de las cuentas registradas.</p>
        </div>
        <a class="primary-button" routerLink="/admin/users/new">Crear usuario</a>
      </div>

      <p class="error" *ngIf="loadError" role="alert">{{ loadError }}</p>
      <section class="panel" aria-label="Listado de usuarios">
        <div class="filters">
          <label class="search-field">
            Buscar usuarios
            <input type="search" [(ngModel)]="searchTerm" placeholder="Nombre o correo electrónico" />
          </label>
          <label>
            Rol
            <select [(ngModel)]="selectedRole">
              <option value="all">Todos los roles</option>
              <option *ngFor="let role of roles" [value]="role">{{ roleLabels[role] }}</option>
            </select>
          </label>
          <label>
            Estado
            <select [(ngModel)]="selectedStatus">
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
        </div>

        <p class="muted" *ngIf="loading">Cargando usuarios…</p>
        <ng-container *ngIf="!loading">
          <p class="empty-state" *ngIf="!users.length && !loadError">Aún no existen usuarios.</p>
          <p class="empty-state" *ngIf="users.length && !filteredUsers.length">
            No hay usuarios que coincidan con la búsqueda o los filtros.
          </p>
          <div class="table-scroll" *ngIf="filteredUsers.length">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th><span class="visually-hidden">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of filteredUsers">
                  <td>
                    <strong>{{ user.name }}</strong>
                    <span class="description">{{ user.email }}</span>
                  </td>
                  <td><span class="role-badge">{{ roleLabels[user.role] }}</span></td>
                  <td>
                    <span class="status" [class.inactive]="!user.isActive">
                      {{ user.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td>{{ user.createdAt | date:'mediumDate' }}</td>
                  <td class="actions">
                    <a class="edit-button" [routerLink]="['/admin/users', user._id]"
                      [attr.aria-label]="'Editar ' + user.name">Editar</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ng-container>
      </section>
    </section>
  `,
    styles: [`
      :host { display: block; }
      .page { max-width: 1200px; margin: 0 auto; padding: 2rem; }
      .page-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      h1, p { margin-top: 0; }
      .page-heading p, .muted { color: #64748b; }
      .panel { margin-top: 1.5rem; padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; }
      .primary-button { display: inline-block; border: 0; border-radius: 8px; padding: .7rem 1rem; background: #c2410c; color: #fff; font: inherit; font-weight: 700; text-decoration: none; white-space: nowrap; }
      .filters { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(170px, .45fr) minmax(150px, .35fr); gap: 1rem; margin-bottom: 1.25rem; }
      label { display: grid; align-content: start; gap: .45rem; color: #334155; font-size: .8rem; font-weight: 700; }
      input, select { width: 100%; box-sizing: border-box; min-height: 42px; padding: .65rem .8rem; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #0f172a; font: inherit; }
      .table-scroll { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; text-align: left; }
      th, td { padding: .9rem .75rem; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
      th { color: #475569; font-size: .78rem; text-transform: uppercase; letter-spacing: .04em; }
      td strong, .description { display: block; }
      .description { margin-top: .3rem; color: #64748b; font-size: .85rem; }
      .role-badge, .status { display: inline-block; padding: .25rem .6rem; border-radius: 999px; background: #fff7ed; color: #9a3412; font-size: .8rem; font-weight: 700; }
      .status { background: #dcfce7; color: #166534; }
      .status.inactive { background: #f1f5f9; color: #475569; }
      .actions { width: 1%; text-align: right; white-space: nowrap; }
      .edit-button { display: inline-block; border-radius: 8px; padding: .55rem .8rem; background: #e2e8f0; color: #0f172a; font-size: .85rem; font-weight: 700; text-decoration: none; }
      .edit-button:hover { background: #ffedd5; color: #9a3412; }
      .empty-state { padding: 2rem 1rem; color: #475569; text-align: center; }
      .error { color: #b91c1c; }
      .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
      @media (max-width: 800px) {
        .page { padding: 1.25rem; }
        .filters { grid-template-columns: 1fr; }
      }
      @media (max-width: 560px) {
        .page-heading { align-items: flex-start; flex-direction: column; }
      }
    `],
})
export class UsersAdminComponent implements OnInit {
    readonly roles: UserRole[] = ['CUSTOMER', 'ADMIN', 'SALES', 'DESIGNER', 'PRODUCTION'];
    readonly roleLabels: Record<UserRole, string> = {
        CUSTOMER: 'Cliente',
        ADMIN: 'Administrador',
        SALES: 'Ventas',
        DESIGNER: 'Diseño',
        PRODUCTION: 'Producción',
    };
    users: UserPublic[] = [];
    loading = true;
    loadError = '';
    searchTerm = '';
    selectedRole = 'all';
    selectedStatus = 'all';

    constructor(
        private readonly adminService: AdminService,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.adminService.getUsers().subscribe({
            next: (users) => {
                this.users = users;
                this.loading = false;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.loadError = 'No se pudieron cargar los usuarios. Verifica tu sesión e intenta nuevamente.';
                this.loading = false;
                this.changeDetector.markForCheck();
            },
        });
    }

    get filteredUsers(): UserPublic[] {
        const term = this.searchTerm.trim().toLocaleLowerCase();
        return this.users.filter((user) => {
            const matchesTerm = !term || [user.name, user.email].some((value) => value.toLocaleLowerCase().includes(term));
            const matchesRole = this.selectedRole === 'all' || user.role === this.selectedRole;
            const matchesStatus = this.selectedStatus === 'all'
                || (this.selectedStatus === 'active' ? user.isActive : !user.isActive);
            return matchesTerm && matchesRole && matchesStatus;
        });
    }
}
