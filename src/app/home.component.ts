import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { environment } from '../environments/environment';

export type ReportType = 'perdida' | 'encontrada';
export type FilterType = 'todas' | ReportType;

export interface PetReport {
  id: string;
  petName: string;
  description: string;
  neighborhood: string;
  lastSeenAddress: string;
  foundAddress: string;
  phone: string;
  type: ReportType;
  imageUrl: string;
  createdAt: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  readonly session$ = this.auth.session$;

  selectedFilter: FilterType = 'todas';
  reports: PetReport[] = [];
  filteredReports: PetReport[] = [];
  selectedImage: File | null = null;
  selectedImageName = 'Ninguna imagen seleccionada';
  isSubmitting = false;
  statusMessage = 'Listo para publicar una mascota.';

  readonly reportForm = this.fb.nonNullable.group({
    petName: ['', [Validators.required, Validators.maxLength(60)]],
    description: ['', [Validators.required, Validators.maxLength(280)]],
    neighborhood: ['', [Validators.required, Validators.maxLength(120)]],
    lastSeenAddress: ['', [Validators.maxLength(180)]],
    foundAddress: ['', [Validators.maxLength(180)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{8,20}$/)]],
    type: ['perdida' as ReportType, Validators.required]
  });

  ngOnInit(): void {
    this.loadReports();
  }

  get totalReports(): number {
    return this.reports.length;
  }

  setFilter(filter: FilterType): void {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedImage = input.files?.[0] ?? null;
    this.selectedImageName = this.selectedImage?.name ?? 'Ninguna imagen seleccionada';
  }

  onSubmit(): void {
    if (this.reportForm.invalid || this.isSubmitting || !this.selectedImage) {
      this.reportForm.markAllAsTouched();
      this.statusMessage = 'Completa todos los campos obligatorios y agrega una foto para publicar.';
      return;
    }

    this.isSubmitting = true;
    const formData = this.buildFormData();
    const request = this.http.post<PetReport>(this.apiUrl, formData);

    request.subscribe({
      next: (savedReport) => {
        this.reports = [savedReport, ...this.reports];

        this.applyFilter();
        this.resetFormState('Reporte publicado correctamente.');
      },
      error: () => {
        this.isSubmitting = false;
        this.statusMessage = 'No se pudo publicar el reporte. Intenta de nuevo.';
      }
    });
  }

  getWhatsAppUrl(report: PetReport): string {
    const cleanNumber = report.phone.replace(/\D/g, '');
    const mxNumber = cleanNumber.startsWith('52') ? cleanNumber : `52${cleanNumber}`;
    const typeText = report.type === 'perdida' ? 'perdida' : 'encontrada';
    const message = encodeURIComponent(
      `Hola, vi la publicacion de ${report.petName} (${typeText}) en ${report.neighborhood}. Quiero compartir informacion.`
    );
    return `https://wa.me/${mxNumber}?text=${message}`;
  }

  trackByReportId(_: number, report: PetReport): string {
    return report.id;
  }

  logout(): void {
    this.auth.logout();
    window.location.href = '/';
  }

  private buildFormData(): FormData {
    const formData = new FormData();

    if (this.selectedImage) {
      formData.append('image', this.selectedImage);
    }

    formData.append('petName', this.reportForm.controls.petName.value.trim());
    formData.append('description', this.reportForm.controls.description.value.trim());
    formData.append('neighborhood', this.reportForm.controls.neighborhood.value.trim());
    formData.append('lastSeenAddress', this.reportForm.controls.lastSeenAddress.value.trim());
    formData.append('foundAddress', this.reportForm.controls.foundAddress.value.trim());
    formData.append('phone', this.reportForm.controls.phone.value.trim());
    formData.append('type', this.reportForm.controls.type.value);

    return formData;
  }

  private resetFormState(message: string): void {
    this.isSubmitting = false;
    this.selectedImage = null;
    this.selectedImageName = 'Ninguna imagen seleccionada';
    this.statusMessage = message;
    this.reportForm.reset({
      petName: '',
      description: '',
      neighborhood: '',
      lastSeenAddress: '',
      foundAddress: '',
      phone: '',
      type: 'perdida'
    });
  }

  private loadReports(): void {
    this.http.get<PetReport[]>(this.apiUrl).subscribe({
      next: (reports) => {
        this.reports = reports;
        this.applyFilter();
        this.statusMessage = reports.length
          ? 'Explora las publicaciones y ayuda a reunir mascotas con sus familias.'
          : 'Aun no hay publicaciones. Sube la primera mascota.';
      },
      error: () => {
        this.reports = [];
        this.filteredReports = [];
        this.statusMessage = 'No se pudieron cargar las publicaciones.';
      }
    });
  }

  private applyFilter(): void {
    this.filteredReports =
      this.selectedFilter === 'todas'
        ? this.reports
        : this.reports.filter((report) => report.type === this.selectedFilter);
  }
}
