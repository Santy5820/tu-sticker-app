import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ResolveFn, Router, RouterLink } from '@angular/router';
import { CustomerAdmin, UserCreateRequest, UserPublic, UserRole, UserUpdateRequest } from '../../../core/models/api';
import { AdminService } from '../../../core/services/admin.service';

export const adminUserResolver: ResolveFn<UserPublic> = (route) =>
    inject(AdminService).getUser(route.paramMap.get('id') ?? '');

@Component({
    selector: 'app-user-editor-admin',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <section class="page">
      <a class="back-link" routerLink="/admin/users">← Volver a usuarios</a>
      <div class="page-heading">
        <div>
          <h1>{{ isCreateMode ? 'Crear usuario' : 'Editar usuario' }}</h1>
          <p *ngIf="editingUser">Consulta y modifica la información de {{ editingUser.name }}.</p>
          <p *ngIf="isCreateMode">Registra una cuenta y asígnale su rol de acceso.</p>
        </div>
      </div>

      <p class="error" *ngIf="loadError" role="alert">{{ loadError }}</p>
      <ng-container *ngIf="!loadError">
        <form class="user-form" (ngSubmit)="saveUser()">
          <h2>Información del usuario</h2>
          <p class="error" *ngIf="formError" role="alert">{{ formError }}</p>
          <div class="form-grid">
            <label>
              Nombre
              <input name="name" [(ngModel)]="draft.name" required maxlength="120" autocomplete="name" />
            </label>
            <label>
              Correo electrónico
              <input name="email" [(ngModel)]="draft.email" required type="email" maxlength="254" autocomplete="email" />
            </label>
            <label>
              Rol
              <select name="role" [(ngModel)]="draft.role" (ngModelChange)="onRoleChange($event)" required>
                <option *ngFor="let role of roles" [ngValue]="role">{{ roleLabels[role] }}</option>
              </select>
            </label>
            <label *ngIf="draft.role === 'CUSTOMER'">
              Cliente asociado
              <select name="customerId" [(ngModel)]="draft.customerId" required>
                <option value="">Selecciona un cliente</option>
                <option *ngFor="let customer of availableCustomers" [value]="customer._id">
                  {{ customer.firstName }} {{ customer.lastName }} · {{ customer.email }}
                </option>
              </select>
              <small *ngIf="customersLoading">Cargando clientes…</small>
              <small class="error" *ngIf="customersError">{{ customersError }}</small>
            </label>
            <label *ngIf="isCreateMode">
              Contraseña inicial
              <input name="password" [(ngModel)]="draft.password" required type="password" autocomplete="new-password" />
            </label>
            <label class="checkbox-field" *ngIf="editingUser">
              <input name="isActive" [(ngModel)]="draft.isActive" type="checkbox" />
              Cuenta activa
            </label>
          </div>
          <div class="form-actions">
            <a class="secondary-button" routerLink="/admin/users">Cancelar</a>
            <button type="submit" class="primary-button" [disabled]="saving">
              {{ saving ? 'Guardando…' : isCreateMode ? 'Crear usuario' : 'Guardar cambios' }}
            </button>
          </div>
        </form>

        <section class="management-panel" *ngIf="editingUser">
          <div>
            <h2>Acceso a la cuenta</h2>
            <p>Restablece la contraseña o desactiva la cuenta del usuario.</p>
          </div>
          <button type="button" class="secondary-button" (click)="showResetForm = !showResetForm">
            {{ showResetForm ? 'Cancelar restablecimiento' : 'Restablecer contraseña' }}
          </button>
          <form *ngIf="showResetForm" class="reset-form" (ngSubmit)="resetPassword()">
            <p class="error" *ngIf="resetError" role="alert">{{ resetError }}</p>
            <label>
              Nueva contraseña
              <input name="newPassword" [(ngModel)]="newPassword" required type="password" autocomplete="new-password" />
            </label>
            <button type="submit" class="primary-button" [disabled]="resetting">
              {{ resetting ? 'Restableciendo…' : 'Guardar contraseña' }}
            </button>
          </form>
          <div class="deactivate-row">
            <p *ngIf="editingUser.isActive">Desactivar impide que el usuario inicie sesión.</p>
            <p *ngIf="!editingUser.isActive">La cuenta está inactiva. Puedes reactivarla desde el formulario.</p>
            <button *ngIf="editingUser.isActive" type="button" class="danger-button"
              [disabled]="deactivating" (click)="deactivateUser()">
              {{ deactivating ? 'Desactivando…' : 'Desactivar usuario' }}
            </button>
          </div>
        </section>
      </ng-container>
    </section>
  `,
    styles: [`
      :host { display: block; }
      .page { max-width: 900px; margin: 0 auto; padding: 2rem; }
      .back-link { display: inline-block; margin-bottom: 1rem; color: #9a3412; font-size: .9rem; font-weight: 700; text-decoration: none; }
      .page-heading p { color: #64748b; }
      h1, h2, p { margin-top: 0; }
      .user-form, .management-panel { display: grid; gap: 1rem; margin-top: 1.5rem; padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; }
      .user-form h2, .management-panel h2 { margin-bottom: 0; font-size: 1.1rem; }
      .management-panel > div:first-child p { margin: .4rem 0 0; color: #64748b; }
      .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
      label { display: grid; align-content: start; gap: .45rem; color: #334155; font-size: .9rem; font-weight: 600; }
      input:not([type="checkbox"]), select { width: 100%; box-sizing: border-box; min-height: 42px; padding: .65rem .8rem; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #0f172a; font: inherit; }
      .checkbox-field { display: flex; align-items: center; gap: .65rem; align-self: center; }
      .checkbox-field input { width: 18px; height: 18px; accent-color: #c2410c; }
      .form-actions, .deactivate-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      .deactivate-row { padding-top: 1rem; border-top: 1px solid #e2e8f0; }
      .deactivate-row p { margin: 0; color: #64748b; }
      button, .primary-button, .secondary-button, .danger-button { display: inline-block; border: 0; border-radius: 8px; padding: .65rem .9rem; font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; }
      button:disabled { cursor: wait; opacity: .65; }
      .primary-button { background: #c2410c; color: #fff; }
      .secondary-button { background: #e2e8f0; color: #0f172a; }
      .danger-button { background: #fee2e2; color: #991b1b; }
      .reset-form { display: flex; align-items: flex-end; gap: 1rem; padding: 1rem; border-radius: 10px; background: #f8fafc; }
      .reset-form label { flex: 1; }
      .reset-form .error { flex-basis: 100%; }
      .error { color: #b91c1c; }
      @media (max-width: 650px) {
        .page { padding: 1.25rem; }
        .form-grid { grid-template-columns: 1fr; }
        .form-actions, .deactivate-row, .reset-form { align-items: stretch; flex-direction: column; }
      }
    `],
})
export class UserEditorAdminComponent implements OnInit {
    readonly roles: UserRole[] = ['CUSTOMER', 'ADMIN', 'SALES', 'DESIGNER', 'PRODUCTION'];
    readonly roleLabels: Record<UserRole, string> = {
        CUSTOMER: 'Cliente',
        ADMIN: 'Administrador',
        SALES: 'Ventas',
        DESIGNER: 'Diseño',
        PRODUCTION: 'Producción',
    };
    readonly isCreateMode: boolean;
    editingUser: UserPublic | null;
    customers: CustomerAdmin[] = [];
    customersLoading = false;
    customersLoaded = false;
    saving = false;
    resetting = false;
    deactivating = false;
    showResetForm = false;
    loadError = '';
    formError = '';
    customersError = '';
    resetError = '';
    newPassword = '';
    draft: { name: string; email: string; role: UserRole; customerId: string; password: string; isActive: boolean };

    constructor(
        private readonly adminService: AdminService,
        private readonly changeDetector: ChangeDetectorRef,
        private readonly route: ActivatedRoute,
        private readonly router: Router,
    ) {
        this.isCreateMode = this.route.snapshot.data['mode'] === 'create';
        this.editingUser = (this.route.snapshot.data['user'] as UserPublic | undefined) ?? null;
        this.draft = this.editingUser
            ? {
                name: this.editingUser.name,
                email: this.editingUser.email,
                role: this.editingUser.role,
                customerId: this.editingUser.customerId ?? '',
                password: '',
                isActive: this.editingUser.isActive,
            }
            : this.emptyDraft();
    }

    ngOnInit(): void {
        if (this.editingUser?.role === 'CUSTOMER' || this.isCreateMode) {
            this.loadCustomers();
        }
    }

    get availableCustomers(): CustomerAdmin[] {
        return this.customers.filter((customer) =>
            !customer.userId || customer.userId === this.editingUser?._id || customer._id === this.draft.customerId
        );
    }

    onRoleChange(role: UserRole): void {
        if (role === 'CUSTOMER') {
            this.loadCustomers();
        }
    }

    saveUser(): void {
        const name = this.draft.name.trim();
        const email = this.draft.email.trim();
        if (!name || !email) {
            this.formError = 'El nombre y el correo electrónico son obligatorios.';
            return;
        }
        if (this.draft.role === 'CUSTOMER' && !this.draft.customerId) {
            this.formError = 'Selecciona el cliente asociado a esta cuenta.';
            return;
        }
        if (this.isCreateMode && !this.draft.password.trim()) {
            this.formError = 'La contraseña inicial es obligatoria.';
            return;
        }
        if (this.draft.role === 'CUSTOMER' && this.customersError) {
            this.formError = 'No se pudo cargar la lista de clientes. Intenta nuevamente.';
            return;
        }

        this.saving = true;
        this.formError = '';
        const commonPayload: UserUpdateRequest = {
            name,
            email,
            role: this.draft.role,
            ...(this.editingUser ? { isActive: this.draft.isActive } : {}),
            ...(this.draft.role === 'CUSTOMER' ? { customerId: this.draft.customerId } : {}),
        };
        const request = this.isCreateMode
            ? this.adminService.createUser({
                name,
                email,
                password: this.draft.password,
                role: this.draft.role,
                isActive: true,
                ...(this.draft.role === 'CUSTOMER' ? { customerId: this.draft.customerId } : {}),
            })
            : this.adminService.updateUser(this.editingUser!._id, commonPayload);

        request.subscribe({
            next: () => {
                this.saving = false;
                void this.router.navigate(['/admin/users']);
            },
            error: (error: { error?: { message?: string } }) => {
                this.formError = error.error?.message ?? 'No se pudo guardar el usuario. Verifica los datos e intenta nuevamente.';
                this.saving = false;
                this.changeDetector.markForCheck();
            },
        });
    }

    resetPassword(): void {
        const password = this.newPassword.trim();
        if (!this.editingUser || !password) {
            this.resetError = 'La nueva contraseña es obligatoria.';
            return;
        }
        this.resetting = true;
        this.resetError = '';
        this.adminService.updateUser(this.editingUser._id, { password }).subscribe({
            next: () => {
                this.resetting = false;
                this.showResetForm = false;
                this.newPassword = '';
                this.changeDetector.markForCheck();
            },
            error: (error: { error?: { message?: string } }) => {
                this.resetError = error.error?.message ?? 'No se pudo restablecer la contraseña. Intenta nuevamente.';
                this.resetting = false;
                this.changeDetector.markForCheck();
            },
        });
    }

    deactivateUser(): void {
        if (!this.editingUser || !window.confirm(`¿Desactivar la cuenta de ${this.editingUser.name}?`)) {
            return;
        }
        this.deactivating = true;
        this.adminService.deleteUser(this.editingUser._id).subscribe({
            next: () => {
                void this.router.navigate(['/admin/users']);
            },
            error: (error: { error?: { message?: string } }) => {
                this.loadError = error.error?.message ?? 'No se pudo desactivar el usuario. Intenta nuevamente.';
                this.deactivating = false;
                this.changeDetector.markForCheck();
            },
        });
    }

    private loadCustomers(): void {
        if (this.customersLoaded || this.customersLoading) {
            return;
        }
        this.customersLoading = true;
        this.customersError = '';
        this.adminService.getActiveCustomers().subscribe({
            next: (customers) => {
                this.customers = customers;
                this.customersLoading = false;
                this.customersLoaded = true;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.customersError = 'No se pudieron cargar los clientes.';
                this.customersLoading = false;
                this.changeDetector.markForCheck();
            },
        });
    }

    private emptyDraft(): { name: string; email: string; role: UserRole; customerId: string; password: string; isActive: boolean } {
        return { name: '', email: '', role: 'CUSTOMER', customerId: '', password: '', isActive: true };
    }
}
