import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PetReport } from './home.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  reports: PetReport[] = [];
  isLoading = false;
  statusMessage = 'Panel listo para administrar publicaciones.';

  ngOnInit(): void {
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

  reload(): void {
    this.loadReports();
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

  trackByReportId(_: number, report: PetReport): string {
    return report.id;
  }

  getWhatsAppUrl(phone: string): string {
    const cleanNumber = phone.replace(/\D/g, '');
    const mxNumber = cleanNumber.startsWith('52') ? cleanNumber : `52${cleanNumber}`;
    return `https://wa.me/${mxNumber}`;
  }

  private loadReports(): void {
    this.isLoading = true;
    this.statusMessage = 'Cargando publicaciones...';

    this.http.get<PetReport[]>(this.apiUrl).subscribe({
      next: (reports) => {
        this.reports = reports;
        this.isLoading = false;
        this.statusMessage = reports.length
          ? 'Administracion activa. Puedes revisar y borrar publicaciones obsoletas.'
          : 'Aun no existen publicaciones.';
      },
      error: () => {
        this.reports = [];
        this.isLoading = false;
        this.statusMessage = 'No se pudieron cargar los reportes.';
      }
    });
  }
}
