import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { HomeComponent } from './home.component';

export const routes: Routes = [
	{
		path: '',
		component: HomeComponent
	},
	{
		path: 'admin',
		component: AdminComponent
	},
	{
		path: '**',
		redirectTo: ''
	}
];
