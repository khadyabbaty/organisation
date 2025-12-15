// src/app/components/dons/dons.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProjetsApi, Projet } from '../../services/projet';
import { DonService, ProjetDon } from '../../services/dons';

@Component({
  selector: 'app-dons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dons.html',
  styleUrls: ['./dons.scss']
})
export class Dons implements OnInit {
  projets: Projet[] = [];
  projetsDons: Map<string | number, ProjetDon> = new Map();
  loading = false;
  error = '';
  selectedProjet: ProjetDon | null = null;

  // Filters
  search = '';

  constructor(
    private projetsApi: ProjetsApi,
    private donService: DonService
  ) {}

  ngOnInit(): void {
    this.chargerProjets();
  }

  // ===================== CHARGER LES PROJETS =====================
  chargerProjets(): void {
    this.loading = true;
    this.error = '';

    this.projetsApi.getAllMine().subscribe({
      next: (projets) => {
        this.projets = projets;
        console.log('✅ [Dons] Projets chargés:', projets.length);

        // Charger les dons pour chaque projet
        this.chargerDonsPourProjets(projets);
      },
      error: (err) => {
        console.error('❌ [Dons] Erreur de chargement des projets:', err);
        this.error = 'Impossible de charger les projets';
        this.loading = false;
      }
    });
  }

  // ===================== CHARGER LES DONS POUR CHAQUE PROJET =====================
  chargerDonsPourProjets(projets: Projet[]): void {
    let completed = 0;
    const total = projets.length;

    if (total === 0) {
      this.loading = false;
      return;
    }

    projets.forEach(projet => {
      this.donService.getActiviteDons(projet.id as string).subscribe({
        next: (projetDon) => {
          this.projetsDons.set(projet.id, projetDon);
          console.log(`✅ [Dons] Dons chargés pour projet ${projet.id}:`, projetDon);
        },
        error: (err) => {
          // Si le projet n'a pas de dons, on met des valeurs par défaut
          console.warn(`⚠️ [Dons] Aucun don pour projet ${projet.id}`);
          this.projetsDons.set(projet.id, {
            id: String(projet.id),
            titre: projet.titre,
            description: projet.description,
            pourcentage: 0,
            nombreDonateurs: 0,
            donateurs: [],
            montantRecolte: 0,
            objectifFinancier: 0
          });
        },
        complete: () => {
          completed++;
          if (completed === total) {
            this.loading = false;
            console.log('✅ [Dons] Tous les dons chargés:', this.projetsDons.size);
          }
        }
      });
    });
  }

  // ===================== FILTERED PROJECTS =====================
  get filtered(): Projet[] {
    let result = this.projets;

    if (this.search.trim()) {
      const term = this.search.toLowerCase();
      result = result.filter(p =>
        p.titre.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        p.organisationNom.toLowerCase().includes(term)
      );
    }

    return result;
  }

  // ===================== TRACK BY =====================
  trackById(index: number, item: Projet): string | number {
    return item.id;
  }

  // ===================== HELPERS =====================
  getDonData(projetId: string | number): ProjetDon | null {
    return this.projetsDons.get(projetId) || null;
  }

  getPourcentage(projetId: string | number): number {
    const donData = this.getDonData(projetId);
    return donData?.pourcentage || 0;
  }

  getMontantRecolte(projetId: string | number): number {
    const donData = this.getDonData(projetId);
    return donData?.montantRecolte || 0;
  }

  getObjectif(projetId: string | number): number {
    const donData = this.getDonData(projetId);
    return donData?.objectifFinancier || 0;
  }

  getNombreDonateurs(projetId: string | number): number {
    const donData = this.getDonData(projetId);
    return donData?.nombreDonateurs || 0;
  }

  formatMontant(montant: number): string {
    return `${montant.toFixed(2)} MRU`;
  }

  // ===================== MEDIA =====================
  mediaSrc(p: Projet): string {
    return p.mediaUrl || 'assets/default-project.jpg';
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.src !== 'assets/default-project.jpg') {
      img.src = 'assets/default-project.jpg';
    }
  }

  // ===================== MODAL DONATEURS =====================
  selectProjet(projet: Projet): void {
    const donData = this.getDonData(projet.id);
    if (donData) {
      this.selectedProjet = donData;
      console.log('📊 [Dons] Détails ouverts pour:', donData.titre);
    }
  }

  closeModal(): void {
    this.selectedProjet = null;
  }

  // ===================== BADGE TYPE DON =====================
  getBadgeClass(typeDon: string): string {
    switch (typeDon) {
      case 'FINANCIER': return 'bg-success';
      case 'EVENEMENTIEL': return 'bg-primary';
      case 'NATURE': return 'bg-warning';
      case 'PARRAINAGE': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  getTypeDonIcon(typeDon: string): string {
    switch (typeDon) {
      case 'FINANCIER': return 'bi-cash-coin';
      case 'EVENEMENTIEL': return 'bi-calendar-event';
      case 'NATURE': return 'bi-box-seam';
      case 'PARRAINAGE': return 'bi-people';
      default: return 'bi-gift';
    }
  }
}
