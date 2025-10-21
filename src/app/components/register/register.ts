// src/app/components/register/register.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
// ✅ dans register.ts, login.ts, etc.
import { throwError } from 'rxjs';
import { finalize, switchMap, take, catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth';

interface RegisterPayload {
  username: string;
  password: string;
  email: string;
  adresse: string;
  telephone: string;
  profil: 'ORGANISATION' | 'ADMIN' | 'DONATEUR' | string;
}

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
    const payload: RegisterPayload = {
      username:  email,                 // identifiant côté back
      password:  this.password,
      email:     email,
      adresse:   this.location.trim(),  // champ attendu par le back
      telephone: this.telephone.trim(),
      profil:    'ORGANISATION'
    };

    this.auth.register(payload).pipe(
      take(1),
      // enchaîner un login auto si inscription OK
      switchMap(() =>
        this.auth.login({ username: email, password: this.password }).pipe(take(1))
      ),
      catchError((err) => {
        this.errorMessage = this.toMsg(err);
        return throwError(() => err);
      }),
      finalize(() => (this.isSubmitting = false))
    )
    .subscribe({
      next: () => this.router.navigate(['/login'], { replaceUrl: true }),
      error: () => {
        // déjà géré dans catchError -> this.errorMessage
      }
    });
  }
}
