import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActiviteUpsert, Projet, ProjetsApi } from '../../services/projet';

@Component({
  selector: 'app-projets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projets.html',
  styleUrls: ['./projets.scss']
})
export class Projets implements OnInit {
  projets: Projet[] = [];
  loading = false;
  error = '';

  // Filters
  search = '';
  statut: 'ALL' | 'EN_COURS' | 'TERMINE' = 'ALL';

  // Modal
  projetModif: any = null;
  nouveauMedia: File | null = null;

  constructor(private projetsApi: ProjetsApi) {}

  ngOnInit(): void {
    this.chargerProjets();
  }

  // Load projects
  chargerProjets(): void {
    this.loading = true;
    this.error = '';

    // Use getAllMine() for organization's projects
    // or getAllScopeAll() for all projects (if admin)
    this.projetsApi.getAllMine().subscribe({
      next: (data) => {
        this.projets = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('[Projets] Load error:', err);
        this.error = 'Impossible de charger les projets';
        this.loading = false;
      }
    });
  }

  // Filtered projects
  get filtered(): Projet[] {
    let result = this.projets;

    // Filter by status
    if (this.statut !== 'ALL') {
      result = result.filter(p => p.statut === this.statut);
    }

    // Filter by search
    if (this.search.trim()) {
      const term = this.search.toLowerCase();
      result = result.filter(p =>
        p.titre.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.organisationNom.toLowerCase().includes(term)
      );
    }

    return result;
  }

  // Track by function for performance
  trackById(index: number, item: Projet): string | number {
    return item.id;
  }

  // Media source helper
  mediaSrc(p: Projet): string {
    return p.mediaUrl || 'assets/default-project.jpg';
  }

  // Image error fallback
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.src !== 'assets/default-project.jpg') {
      img.src = 'assets/default-project.jpg';
    }
  }

  // Open edit modal
  modifierProjet(projet: Projet): void {
    // Clone the project to avoid mutating the original
    this.projetModif = {
      id: projet.id,
      titre: projet.titre,
      description: projet.description,
      statut: projet.statut,
      urgent: projet.urgent || false,
      mediaUrl: projet.mediaUrl,
      mediaType: projet.mediaType,
      organisationId: projet.organisationId
    };
    this.nouveauMedia = null;
  }

  // Close modal
  fermerModal(): void {
    this.projetModif = null;
    this.nouveauMedia = null;
  }

  // Handle media file change
  changerMedia(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.nouveauMedia = file;

      // Preview the new media
      const reader = new FileReader();
      reader.onload = (e) => {
        if (this.projetModif) {
          this.projetModif.mediaUrl = e.target?.result as string;

          // Detect media type
          const type = file.type.split('/')[0];
          this.projetModif.mediaType = type === 'video' ? 'video' : 'image';
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Save project changes
  sauvegarderProjet(): void {
    if (!this.projetModif) return;

    this.loading = true;
    this.error = '';

    // Prepare update payload
    const payload: ActiviteUpsert = {
      titre: this.projetModif.titre,
      description: this.projetModif.description || '',
      dateDebut: new Date().toISOString().split('T')[0], // Current date
      urgent: this.projetModif.urgent,
      image: this.nouveauMedia
    };

    // Note: You might need to add dateFin based on statut
    if (this.projetModif.statut === 'TERMINE') {
      payload.dateFin = new Date().toISOString().split('T')[0];
    }

    this.projetsApi.update(this.projetModif.id, payload).subscribe({
      next: (updated) => {
        // Update the project in the list
        const index = this.projets.findIndex(p => p.id === updated.id);
        if (index !== -1) {
          this.projets[index] = updated;
        }

        this.loading = false;
        this.fermerModal();

        console.log('[Projets] Project updated successfully');
      },
      error: (err) => {
        console.error('[Projets] Update error:', err);
        this.error = 'Impossible de sauvegarder les modifications';
        this.loading = false;
      }
    });
  }

  // Delete project
  supprimerProjet(id: string | number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.projetsApi.delete(id).subscribe({
      next: () => {
        // Remove from list
        this.projets = this.projets.filter(p => p.id !== id);
        this.loading = false;

        console.log('[Projets] Project deleted successfully');
      },
      error: (err) => {
        console.error('[Projets] Delete error:', err);
        this.error = 'Impossible de supprimer le projet';
        this.loading = false;
      }
    });
  }
}
