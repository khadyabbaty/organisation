import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss']
})
export class ForgotPassword {
  email: string = '';
  message: string = '';

  constructor(private router: Router) {}

  resetPassword() {
    // Ici tu enverras une requête à ton backend pour reset
    this.message = 'Si cet email est enregistré, un lien de réinitialisation a été envoyé.';
    setTimeout(() => this.router.navigate(['/login']), 3000);
  }
}
