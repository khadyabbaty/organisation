import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserProfile, UserService } from '../../services/profil';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profil.html',
  styleUrls: ['./profil.scss']
})
export class Profil implements OnInit {
  user: UserProfile | null = null;
  loading = true;
  error = '';

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userService.getProfile().subscribe({
      next: (data) => {
        this.user = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('[Profil] load error:', err);
        this.error = 'Impossible de charger le profil utilisateur.';
        this.loading = false;
      }
    });
  }

  logout(): void {
    this.authService.deconnexion();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  imgFallback(ev: Event) {
    const img = ev.target as HTMLImageElement | null;
    if (img) img.src = 'assets/user.png';
  }
  get rolesAsText(): string {
  return this.user?.roles?.join(', ') ?? '—';
}
}
