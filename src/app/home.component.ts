import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  private readonly apiUrl = environment.apiUrl;

  selectedFilter: FilterType = 'todas';
  reports: PetReport[] = [];
  filteredReports: PetReport[] = [];
  selectedImage: File | null = null;
  selectedImageName = 'Ninguna imagen seleccionada';
  editingReportId: string | null = null;
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

  startEdit(report: PetReport): void {
    this.editingReportId = report.id;
    this.statusMessage = `Editando ${report.petName}. Actualiza los datos y guarda los cambios.`;
    this.reportForm.setValue({
      petName: report.petName,
      description: report.description,
      neighborhood: report.neighborhood,
      lastSeenAddress: report.lastSeenAddress,
      foundAddress: report.foundAddress,
      phone: report.phone,
      type: report.type
    });
    this.selectedImage = null;
    this.selectedImageName = 'La foto actual se mantiene si no eliges una nueva.';
    document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cancelEdit(): void {
    this.editingReportId = null;
    this.selectedImage = null;
    this.selectedImageName = 'Ninguna imagen seleccionada';
    this.statusMessage = 'Edicion cancelada. Puedes publicar una nueva mascota.';
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

  scrollToForm(): void {
    document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedImage = input.files?.[0] ?? null;
    this.selectedImageName = this.selectedImage?.name ?? 'Ninguna imagen seleccionada';
  }

  onSubmit(): void {
    if (this.reportForm.invalid || this.isSubmitting || (!this.selectedImage && !this.editingReportId)) {
      this.reportForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.buildFormData();
    const request = this.editingReportId
      ? this.http.put<PetReport>(`${this.apiUrl}/${this.editingReportId}`, formData)
      : this.http.post<PetReport>(this.apiUrl, formData);

    request.subscribe({
      next: (savedReport) => {
        this.reports = this.editingReportId
          ? this.reports.map((report) => (report.id === savedReport.id ? savedReport : report))
          : [savedReport, ...this.reports];

        this.applyFilter();
        this.resetFormState(this.editingReportId ? 'Reporte actualizado correctamente.' : 'Reporte publicado correctamente.');
      },
      error: () => {
        this.isSubmitting = false;
        this.statusMessage = this.editingReportId
          ? 'No se pudo actualizar el reporte. Intenta otra vez.'
          : 'No se pudo publicar el reporte. Intenta de nuevo.';
      }
    });
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
        this.applyFilter();

        if (this.editingReportId === reportId) {
          this.cancelEdit();
        }

        this.statusMessage = 'Publicacion eliminada.';
      },
      error: () => {
        this.statusMessage = 'No se pudo eliminar la publicacion.';
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
    this.editingReportId = null;
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
