// src/app/components/login/login.ts
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  // ✅ injection sans constructeur
  private readonly router = inject(Router);
  private readonly auth   = inject(AuthService);

  email = '';
  password = '';
  errorMessage = '';
  submitting = false;

  get canSubmit(): boolean {
    return !!this.email && !!this.password && !this.submitting;
  }

  login(): void {
    this.errorMessage = '';
    if (!this.canSubmit) return;

    this.submitting = true;

    this.auth.login({ username: this.email, password: this.password })
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err: HttpErrorResponse) => {
          this.errorMessage =
            (err.error && (err.error.message || err.error.error || err.error)) ||
            err.message || 'Identifiants invalides';
        }
      });
  }
}
