import { Routes } from '@angular/router';
import { adminGuard } from './auth/admin.guard';
import { authGuard } from './auth/auth.guard';
import { AdminComponent } from './admin.component';
import { DashboardComponent } from './dashboard.component';
import { LoginComponent } from './login.component';
import { HomeComponent } from './home.component';
import { RegisterComponent } from './register.component';

export const routes: Routes = [
	{
		path: '',
		component: HomeComponent
	},
	{
		path: 'login',
		component: LoginComponent
	},
	{
		path: 'register',
		component: RegisterComponent
	},
	{
		path: 'dashboard',
		component: DashboardComponent,
		canActivate: [authGuard]
	},
	{
		path: 'admin',
		canActivate: [adminGuard],
		component: AdminComponent
	},
	{
		path: '**',
		redirectTo: ''
	}
];
