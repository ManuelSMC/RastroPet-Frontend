import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { AuthSession } from './auth/auth.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);

  session: AuthSession | null = null;
  totalUsers = 0;
  adminCount = 0;

  async ngOnInit(): Promise<void> {
    await this.auth.ensureReady();
    this.session = this.auth.currentUser;

    try {
      const stats = await this.auth.getUserStats();
      this.totalUsers = stats.totalUsers;
      this.adminCount = stats.totalAdmins;
    } catch {
      this.totalUsers = 0;
      this.adminCount = 0;
    }
  }

  logout(): void {
    this.auth.logout();
    window.location.href = '/login';
  }
}
