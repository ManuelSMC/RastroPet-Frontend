import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isSubmitting = false;
  errorMessage = '';

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async submit(): Promise<void> {
    if (this.loginForm.invalid || this.isSubmitting) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const session = await this.auth.login(
        this.loginForm.controls.email.value,
        this.loginForm.controls.password.value
      );
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const nextRoute = returnUrl || (session.role === 'admin' ? '/admin' : '/dashboard');
      await this.router.navigateByUrl(nextRoute);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'No se pudo iniciar sesion';
    } finally {
      this.isSubmitting = false;
    }
  }
}
