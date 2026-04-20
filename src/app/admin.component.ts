import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PetReport } from './home.component';
import { AppUser, AuthSession, UserFormInput, UserRole } from './auth/auth.models';
import { AuthService } from './auth/auth.service';
import { environment } from '../environments/environment';

type AdminSection = 'reports' | 'users';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  session: AuthSession | null = null;
  reports: PetReport[] = [];
  users: AppUser[] = [];
  isLoadingReports = false;
  isLoadingUsers = false;
  isSavingUser = false;
  statusMessage = 'Panel listo para administrar publicaciones y usuarios.';
  activeSection: AdminSection = 'reports';
  editingUserId: string | null = null;

  readonly userForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['user' as UserRole, Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async ngOnInit(): Promise<void> {
    await this.auth.ensureReady();
    this.session = this.auth.currentUser;
    await this.loadUsers();
    this.loadReports();
  }

  get totalReports(): number {
    return this.reports.length;
  }

  get lostReports(): number {
    return this.reports.filter((report) => report.type === 'perdida').length;
  }

  get foundReports(): number {
    return this.reports.filter((report) => report.type === 'encontrada').length;
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get adminUsers(): number {
    return this.users.filter((user) => user.role === 'admin').length;
  }

  setSection(section: AdminSection): void {
    this.activeSection = section;
  }

  reload(): void {
    this.loadReports();
    void this.loadUsers();
  }

  logout(): void {
    this.auth.logout();
    window.location.href = '/login';
  }

  deleteReport(reportId: string): void {
    const report = this.reports.find((item) => item.id === reportId);
    const confirmed = window.confirm(`Eliminar la publicacion de ${report?.petName ?? 'esta mascota'}?`);

    if (!confirmed) {
      return;
    }

    this.http.delete(`${this.apiUrl}/${reportId}`).subscribe({
      next: () => {
        this.reports = this.reports.filter((item) => item.id !== reportId);
        this.statusMessage = 'Reporte eliminado correctamente.';
      },
      error: () => {
        this.statusMessage = 'No se pudo eliminar el reporte.';
      }
    });
  }

  startUserEdit(user: AppUser): void {
    this.activeSection = 'users';
    this.editingUserId = user.id;
    this.userForm.setValue({
      name: user.name,
      email: user.email,
      role: user.role,
      password: ''
    });
    this.statusMessage = `Editando usuario ${user.name}.`;
  }

  cancelUserEdit(): void {
    this.editingUserId = null;
    this.userForm.reset({
      name: '',
      email: '',
      role: 'user',
      password: ''
    });
    this.statusMessage = 'Edicion de usuario cancelada.';
  }

  async submitUser(): Promise<void> {
    if (this.userForm.invalid || this.isSavingUser) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSavingUser = true;

    try {
      const input: UserFormInput = {
        name: this.userForm.controls.name.value,
        email: this.userForm.controls.email.value,
        role: this.userForm.controls.role.value,
        password: this.userForm.controls.password.value
      };

      if (this.editingUserId) {
        await this.auth.updateUser(this.editingUserId, input);
        this.statusMessage = 'Usuario actualizado correctamente.';
      } else {
        await this.auth.createUser(input);
        this.statusMessage = 'Usuario creado correctamente.';
      }

      await this.loadUsers();
      this.editingUserId = null;
      this.userForm.reset({
        name: '',
        email: '',
        role: 'user',
        password: ''
      });
    } catch (error) {
      this.statusMessage = error instanceof Error ? error.message : 'No se pudo guardar el usuario.';
    } finally {
      this.isSavingUser = false;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const user = this.users.find((item) => item.id === userId);
    const confirmed = window.confirm(`Eliminar el usuario ${user?.name ?? 'seleccionado'}?`);

    if (!confirmed) {
      return;
    }

    try {
      await this.auth.deleteUser(userId);
      await this.loadUsers();
      this.statusMessage = 'Usuario eliminado correctamente.';
    } catch (error) {
      this.statusMessage = error instanceof Error ? error.message : 'No se pudo eliminar el usuario.';
    }
  }

  trackByReportId(_: number, report: PetReport): string {
    return report.id;
  }

  trackByUserId(_: number, user: AppUser): string {
    return user.id;
  }

  getWhatsAppUrl(phone: string): string {
    const cleanNumber = phone.replace(/\D/g, '');
    const mxNumber = cleanNumber.startsWith('52') ? cleanNumber : `52${cleanNumber}`;
    return `https://wa.me/${mxNumber}`;
  }

  private loadReports(): void {
    this.isLoadingReports = true;
    this.statusMessage = 'Cargando publicaciones...';

    this.http.get<PetReport[]>(this.apiUrl).subscribe({
      next: (reports) => {
        this.reports = reports;
        this.isLoadingReports = false;
        this.statusMessage = reports.length
          ? 'Administracion activa. Puedes revisar y borrar publicaciones obsoletas.'
          : 'Aun no existen publicaciones.';
      },
      error: () => {
        this.reports = [];
        this.isLoadingReports = false;
        this.statusMessage = 'No se pudieron cargar los reportes.';
      }
    });
  }

  private async loadUsers(): Promise<void> {
    this.isLoadingUsers = true;
    try {
      this.users = await this.auth.fetchUsers();
    } catch (_error) {
      this.users = this.auth.listUsers();
      this.statusMessage = 'No se pudo cargar la lista de usuarios.';
    } finally {
      this.isLoadingUsers = false;
    }
  }
}
