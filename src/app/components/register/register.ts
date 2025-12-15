// src/app/components/register/register.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { throwError } from 'rxjs';
import { finalize, switchMap, take, catchError } from 'rxjs/operators';
import { AuthService, InscriptionPayload, ConnexionPayload } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  name = '';
  email = '';
  location = '';
  telephone = '';
  password = '';
  confirmPassword = '';

  showPassword = false;
  isSubmitting = false;
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  private toMsg(err: any): string {
    return (
      err?.error?.error ||
      err?.error?.message ||
      err?.message ||
      'Une erreur est survenue. Réessayez.'
    );
  }

  register(form: NgForm) {
  this.errorMessage = '';
  if (this.isSubmitting) return;

  if (!form.valid) {
    this.errorMessage = 'Merci de remplir correctement le formulaire.';
    form.form.markAllAsTouched();
    return;
  }
  if (this.password !== this.confirmPassword) {
    this.errorMessage = 'Les mots de passe ne correspondent pas.';
    return;
  }

  this.isSubmitting = true;

  const email = this.email.trim();

  // ✅ CRÉER LE PAYLOAD AVEC LE NOM DE L'ORGANISATION
  const payload: InscriptionPayload = {
    username: email,
    password: this.password,
    email: email,
    adresse: this.location.trim(),
    telephone: this.telephone.trim(),
    profil: 'ORGANISATION',
    organisationNom: this.name.trim()  // ✅ Envoyer le nom fourni par l'utilisateur
  };

  console.log('[Register] 📝 Inscription avec organisation:', {
    username: email,
    organisationNom: this.name.trim()
  });

  this.auth.inscrire(payload).pipe(
    take(1),
    switchMap(() => {
      console.log('[Register] ✅ Inscription réussie, connexion automatique...');
      const connexionPayload: ConnexionPayload = {
        username: email,
        password: this.password
      };
      return this.auth.connexion(connexionPayload).pipe(take(1));
    }),
    catchError((err) => {
      this.errorMessage = this.toMsg(err);
      console.error('[Register] ❌ Erreur:', err);
      return throwError(() => err);
    }),
    finalize(() => (this.isSubmitting = false))
  )
  .subscribe({
    next: () => {
      console.log('[Register] 🎉 Redirection vers dashboard');
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    },
    error: () => {
      // Erreur déjà gérée dans catchError
    }
  });
}
}
