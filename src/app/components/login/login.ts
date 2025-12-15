import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  email = '';
  password = '';
  showPassword = false;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    console.log('[Login] 🚀 Composant initialisé');
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  login(form: NgForm): void {
    console.log('[Login] 📝 Tentative de connexion');

    this.errorMessage = '';

    if (this.isSubmitting) return;

    if (!form.valid || !this.email || !this.password) {
      this.errorMessage = 'Email et mot de passe requis';
      return;
    }

    this.isSubmitting = true;
    console.log('[Login] 🔐 Connexion pour:', this.email);

    this.authService.connexion({
      username: this.email.trim(),
      password: this.password
    }).subscribe({
      next: (response) => {
        console.log('[Login] ✅ Connexion réussie');
        console.log('[Login] 📥 Réponse:', response);

        // 🔍 DEBUG: Vérifier si le token a été sauvegardé
        const token = localStorage.getItem('access_token');
        console.log('[Login] 🔑 Token en localStorage:', !!token);
        if (token) {
          console.log('[Login] 🔑 Token (50 premiers chars):', token.substring(0, 50) + '...');
        } else {
          console.error('[Login] ❌ TOKEN NON TROUVÉ DANS LOCALSTORAGE !');
        }

        this.isSubmitting = false;

        // Attendre un peu avant de naviguer
        setTimeout(() => {
          console.log('[Login] 🚀 Navigation vers /dashboard');
          this.router.navigate(['/dashboard'], { replaceUrl: true });
        }, 500);
      },
      error: (err) => {
        console.error('[Login] ❌ Erreur:', err);
        this.errorMessage = err?.error?.error || err?.message || 'Erreur de connexion';
        this.isSubmitting = false;
      }
    });
  }
}