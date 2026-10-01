import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { perfilCompletoGuard, perfilPendienteGuard } from '../core/guards/paciente-perfil.guard';

/**
 * Portal del paciente: pagina publica (informacion, preguntas frecuentes y
 * asistente virtual) y area privada (mis citas, mi perfil, Telegram).
 */
export const rutasPortal: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('../features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/registro',
    loadComponent: () => import('../features/auth/registro/registro').then((m) => m.RegistroComponent),
  },
  {
    path: 'auth/verificar-email',
    loadComponent: () => import('../features/auth/verificar-email/verificar-email').then((m) => m.VerificarEmailComponent),
  },
  {
    path: 'auth/recuperar-password',
    loadComponent: () => import('../features/auth/recuperar-password/recuperar-password').then((m) => m.RecuperarPasswordComponent),
  },
  {
    path: 'auth/restablecer-password',
    loadComponent: () =>
      import('../features/auth/restablecer-password/restablecer-password').then((m) => m.RestablecerPasswordComponent),
  },
  {
    path: '',
    loadComponent: () => import('./portal-layout/portal-layout').then((m) => m.PortalLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Fundación oncológica · Portal del paciente',
        loadComponent: () => import('./inicio/inicio').then((m) => m.InicioPortalComponent),
      },
      {
        path: 'preguntas-frecuentes',
        title: 'Preguntas frecuentes',
        loadComponent: () => import('./preguntas/preguntas-publicas').then((m) => m.PreguntasPublicasComponent),
      },
      {
        path: 'completar-perfil',
        title: 'Completar mi perfil',
        canActivate: [authGuard, perfilPendienteGuard],
        loadComponent: () =>
          import('../features/paciente-portal/completar-perfil/completar-perfil').then((m) => m.CompletarPerfilComponent),
      },
      {
        path: 'mis-citas',
        title: 'Mis citas',
        canActivate: [authGuard, perfilCompletoGuard],
        loadComponent: () => import('../features/paciente-portal/mis-citas/mis-citas').then((m) => m.MisCitasComponent),
      },
      {
        path: 'mi-perfil',
        title: 'Mi perfil',
        canActivate: [authGuard, perfilCompletoGuard],
        loadComponent: () => import('../features/paciente-portal/mi-perfil/mi-perfil').then((m) => m.MiPerfilComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
