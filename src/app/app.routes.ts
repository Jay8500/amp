import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },

  // Signed-out
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/login/login-page').then((m) => m.LoginPage) },
  { path: 'setup', canActivate: [guestGuard], loadComponent: () => import('./features/setup/setup-page').then((m) => m.SetupPage) },
  {
    path: 'forgot-pin',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/forgot-pin-page').then((m) => m.ForgotPinPage),
  },

  // Signed-in, with bottom navigation
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/shell/shell').then((m) => m.Shell),
    children: [
      { path: 'home', title: 'Accounts Manager', loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage) },
      { path: 'expiry', title: 'Expiry', loadComponent: () => import('./features/expiry/expiry-page').then((m) => m.ExpiryPage) },
    ],
  },

  // Signed-in, full-screen
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: 'ott-select', loadComponent: () => import('./features/ott-select/ott-select-page').then((m) => m.OttSelectPage) },
      { path: 'sale', loadComponent: () => import('./features/sale/sale-page').then((m) => m.SalePage) },
      { path: 'data/:brand', loadComponent: () => import('./features/data/data-page').then((m) => m.DataPage) },
      { path: 'recent-sales', loadComponent: () => import('./features/recent-sales/recent-sales-page').then((m) => m.RecentSalesPage) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings-page').then((m) => m.SettingsPage) },
      {
        path: 'settings/form/:kind',
        loadComponent: () => import('./features/settings/form-builder/form-builder-page').then((m) => m.FormBuilderPage),
      },
      {
        path: 'settings/general',
        loadComponent: () => import('./features/settings/general/general-settings-page').then((m) => m.GeneralSettingsPage),
      },
      {
        path: 'settings/connection',
        loadComponent: () => import('./features/settings/connection/connection-page').then((m) => m.ConnectionPage),
      },
    ],
  },

  { path: '**', redirectTo: 'home' },
];
