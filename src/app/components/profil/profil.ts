import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfile, UserService } from '../../services/profil';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profil.html',
  styleUrls: ['./profil.scss']
})
export class Profil implements OnInit {
  user!: UserProfile;
  loading = true;
  error = '';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    // IMPORTANT: assure-toi d’avoir provideHttpClient(withFetch()) ou HttpClientModule
    this.userService.getProfile().subscribe({
      next: (data) => { this.user = data; this.loading = false; },
      error: (err) => {
        this.error = 'Impossible de charger le profil utilisateur.';
        this.loading = false;
        console.error('[Profil] load error:', err);
      }
    });

    // pare-feu si l’Observable ne termine pas (évite "Chargement…" bloqué)
    setTimeout(() => { if (this.loading) this.loading = false; }, 8000);
  }

  logout(): void {
    // adapte selon ta stratégie (cookies httpOnly côté back -> appelle /auth/logout et redirect)
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  }

  imgFallback(ev: Event, url: string) {
    const img = ev.target as HTMLImageElement | null;
    if (img && img.src !== url) img.src = url;
  }
}
