import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DonService, DonStats } from '../../services/dons'; // <-- adapte le chemin si besoin

type TypeDon = 'financier' | 'nature' | 'parrainage' | 'evenementiel';

interface DonCarte {
  label: string;
  color: string;   // classe bootstrap
  icon: string;    // classe bootstrap-icons
  type: TypeDon;
}

@Component({
  selector: 'app-donateur',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dons.html',
  styleUrls: ['./dons.scss']
})
export class dons implements OnInit {

  // valeurs "réelles"
  dons: Record<TypeDon, number> = {
    financier: 0,
    nature: 0,
    parrainage: 0,
    evenementiel: 0
  };

  // valeurs affichées (animées)
  donsAffichage: Record<TypeDon, number> = {
    financier: 0,
    nature: 0,
    parrainage: 0,
    evenementiel: 0
  };

  // badge +N temporaire
  plusBadge: Record<TypeDon, number | null> = {
    financier: null,
    nature: null,
    parrainage: null,
    evenementiel: null
  };

  cartes: DonCarte[] = [
    { label: 'Financier',    color: 'primary', icon: 'bi-cash-stack',      type: 'financier' },
    { label: 'Nature',       color: 'success', icon: 'bi-tree',            type: 'nature' },
    { label: 'Parrainage',   color: 'info',    icon: 'bi-people',          type: 'parrainage' },
    { label: 'Événementiel', color: 'warning', icon: 'bi-calendar-event',  type: 'evenementiel' }
  ];

  loading = false;
  error?: string;

  constructor(private donsApi: DonService) {}

  ngOnInit(): void {
    this.fetchStats();
  }

  /** Charge les stats depuis /api/dons/stats */
  fetchStats(): void {
    this.loading = true;
    this.error = undefined;

    this.donsApi.getStats().subscribe({
      next: (stats: DonStats) => {
        // normalise et anime
        const safe: DonStats = {
          financier: stats?.financier ?? 0,
          nature: stats?.nature ?? 0,
          parrainage: stats?.parrainage ?? 0,
          evenementiel: stats?.evenementiel ?? 0
        };
        (Object.keys(safe) as TypeDon[]).forEach((k) => {
          const from = this.donsAffichage[k] ?? 0;
          const to = safe[k] ?? 0;
          this.dons[k] = to;
          this.animateCount(k, from, to, 800);
        });
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les statistiques.';
        this.loading = false;
      }
    });
  }

  /** Animation du compteur */
  private animateCount(type: TypeDon, from: number, to: number, duration = 800) {
    const start = performance.now();
    const diff = to - from;

    if (diff > 0) {
      // affiche un badge +N furtif si progression
      this.plusBadge[type] = diff;
      setTimeout(() => (this.plusBadge[type] = null), 900);
    }

    if (diff === 0) {
      this.donsAffichage[type] = to;
      return;
    }

    const step = (timestamp: number) => {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      this.donsAffichage[type] = Math.round(from + diff * eased);
      if (progress < 1) requestAnimationFrame(step);
      else this.donsAffichage[type] = to;
    };
    requestAnimationFrame(step);
  }
  // dans DonateurComponent (donateur.ts)
  supprimerDon(id: number | string): void {
    // Écran Donateur = dashboard de stats → pas de suppression ici par défaut
    // Tu peux soit retirer le bouton dans le HTML, soit implémenter un vrai delete côté back + service.
    console.warn('supprimerDon() appelé avec id =', id, '— non implémenté sur le dashboard Donateur.');
    alert('Suppression non disponible sur cet écran.');
  }

}
