import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActiviteUpsert, Projet, ProjetsApi } from '../../services/projet';
import * as L from 'leaflet';

@Component({
  selector: 'app-projets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projets.html',
  styleUrls: ['./projets.scss']
})
export class Projets implements OnInit, OnDestroy {
  projets: Projet[] = [];
  loading = false;
  error = '';

  search = '';
  statut: 'ALL' | 'EN_COURS' | 'TERMINE' = 'ALL';

  projetModif: any = null;
  nouveauMedia: File | null = null;

  showMapSelector = false;
  tempLatitude: number = 33.5731;
  tempLongitude: number = -7.5898;
  map: any = null;
  currentMarker: any = null;

  projetGPS: any = null;
  mapView: any = null;

  constructor(private projetsApi: ProjetsApi) {}

  ngOnInit(): void {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      iconUrl: 'assets/marker-icon.png',
      shadowUrl: 'assets/marker-shadow.png',
    });

    this.chargerProjets();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
    if (this.mapView) this.mapView.remove();
  }

  // ========================================
  // 🔒 CHARGER LES PROJETS
  // ========================================
  chargerProjets(): void {
    this.loading = true;
    this.error = '';

    this.projetsApi.getAllMine().subscribe({
      next: (data) => {
        console.log(`✅ ${data.length} projets chargés`);
        console.log('📊 Projets avec statuts:', data);
        this.projets = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.error = 'Impossible de charger les projets';
        this.loading = false;
      }
    });
  }

  // ========================================
  // 🔍 FILTRAGE
  // ========================================
  get filtered(): Projet[] {
    let result = this.projets;

    // ✅ Filtrer par statut
    if (this.statut !== 'ALL') {
      result = result.filter(p => p.statut === this.statut);
    }

    // ✅ Filtrer par recherche
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

  trackById(index: number, item: Projet): string | number {
    return item.id;
  }

  // ========================================
  // 📸 MEDIA
  // ========================================
  mediaSrc(p: Projet): string {
    return p.mediaUrl || 'assets/default-project.jpg';
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.src !== 'assets/default-project.jpg') {
      img.src = 'assets/default-project.jpg';
    }
  }

  // ========================================
  // ✏️ MODIFICATION
  // ========================================
  modifierProjet(projet: Projet): void {
    this.projetModif = {
      ...projet,
      statut: projet.statut || 'EN_COURS'
    };
    this.nouveauMedia = null;
    this.error = '';
  }

  fermerModal(): void {
    this.projetModif = null;
    this.nouveauMedia = null;
    this.error = '';
  }

  changerMedia(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.nouveauMedia = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (this.projetModif && e.target?.result) {
          this.projetModif.mediaUrl = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  sauvegarderProjet(): void {
    if (!this.projetModif) return;

    this.loading = true;
    this.error = '';

    // ✅ Vérifier GPS
    if (!this.projetModif.latitude || !this.projetModif.longitude) {
      this.error = 'La position GPS est obligatoire';
      this.loading = false;
      return;
    }

    const payload: ActiviteUpsert = {
      titre: this.projetModif.titre.trim(),
      description: this.projetModif.description?.trim() || '',
      dateDebut: this.projetModif.dateCreation
        ? new Date(this.projetModif.dateCreation).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      urgent: this.projetModif.urgent || false,
      image: this.nouveauMedia || undefined,
      latitude: this.projetModif.latitude,
      longitude: this.projetModif.longitude,
      statut: this.projetModif.statut || 'EN_COURS' // ✅ Envoyer le statut
    };

    // ✅ Si TERMINÉ, ajouter dateFin
    if (this.projetModif.statut === 'TERMINE') {
      payload.dateFin = new Date().toISOString().split('T')[0];
    }

    console.log('[Projets] Sauvegarde du projet avec statut:', payload.statut);

    this.projetsApi.update(this.projetModif.id, payload).subscribe({
      next: (updated) => {
        console.log('✅ Projet mis à jour:', updated);
        const index = this.projets.findIndex(p => p.id === updated.id);
        if (index !== -1) this.projets[index] = updated;
        this.loading = false;
        this.fermerModal();
        alert('✅ Projet modifié');
      },
      error: (err) => {
        console.error('❌ Erreur:', err);
        this.error = err.error?.message || 'Erreur de sauvegarde';
        this.loading = false;
      }
    });
  }

  // ========================================
  // 🗑️ SUPPRESSION
  // ========================================
  supprimerProjet(id: string | number): void {
    if (!confirm('⚠️ Supprimer ce projet ?')) return;

    this.loading = true;
    this.error = '';

    this.projetsApi.delete(id).subscribe({
      next: () => {
        this.projets = this.projets.filter(p => p.id !== id);
        this.loading = false;
        alert('✅ Projet supprimé');
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur de suppression';
        this.loading = false;
      }
    });
  }

  // ========================================
  // 🗺️ CARTE - SÉLECTION
  // ========================================
  ouvrirCarteSelection(): void {
    this.tempLatitude = this.projetModif?.latitude || 33.5731;
    this.tempLongitude = this.projetModif?.longitude || -7.5898;
    this.showMapSelector = true;
    setTimeout(() => this.initSelectionMap(), 100);
  }

  fermerCarteSelection(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.showMapSelector = false;
  }

  initSelectionMap(): void {
    if (this.map) {
      this.map.invalidateSize();
      return;
    }
    this.map = L.map('map').setView([this.tempLatitude, this.tempLongitude], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.creerMarqueur(this.tempLatitude, this.tempLongitude);

    this.map.on('click', (e: any) => {
      this.tempLatitude = Number(e.latlng.lat.toFixed(6));
      this.tempLongitude = Number(e.latlng.lng.toFixed(6));
      if (this.currentMarker) {
        this.currentMarker.setLatLng([this.tempLatitude, this.tempLongitude]);
      } else {
        this.creerMarqueur(this.tempLatitude, this.tempLongitude);
      }
    });
  }

  creerMarqueur(lat: number, lng: number): void {
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);"></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });

    if (this.currentMarker) this.map.removeLayer(this.currentMarker);

    this.currentMarker = L.marker([lat, lng], { icon, draggable: true }).addTo(this.map);
    this.currentMarker.on('dragend', (e: any) => {
      this.tempLatitude = Number(e.target.getLatLng().lat.toFixed(6));
      this.tempLongitude = Number(e.target.getLatLng().lng.toFixed(6));
    });
  }

  validerPosition(): void {
    if (this.tempLatitude && this.tempLongitude) {
      if (this.projetModif) {
        this.projetModif.latitude = this.tempLatitude;
        this.projetModif.longitude = this.tempLongitude;
      }
      this.fermerCarteSelection();
      alert('✅ Position GPS enregistrée !');
    }
  }

  centrerSurMaPosition(): void {
    if (!this.map) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.tempLatitude = Number(pos.coords.latitude.toFixed(6));
        this.tempLongitude = Number(pos.coords.longitude.toFixed(6));
        this.map.setView([this.tempLatitude, this.tempLongitude], 15);
        if (this.currentMarker) {
          this.currentMarker.setLatLng([this.tempLatitude, this.tempLongitude]);
        } else {
          this.creerMarqueur(this.tempLatitude, this.tempLongitude);
        }
        alert('✅ Position actuelle localisée !');
      },
      () => alert('❌ Géolocalisation impossible')
    );
  }

  // ========================================
  // 🗺️ CARTE - VISUALISATION
  // ========================================
  hasGPS(p: Projet): boolean {
    return p.latitude != null && p.longitude != null;
  }

  openMap(p: Projet): void {
    if (!this.hasGPS(p)) {
      alert('📍 Ce projet ne contient pas de position GPS');
      return;
    }
    this.projetGPS = p;
    setTimeout(() => this.initViewMap(), 100);
  }

  fermerMapModal(): void {
    if (this.mapView) {
      this.mapView.remove();
      this.mapView = null;
    }
    this.projetGPS = null;
  }

  initViewMap(): void {
    if (!this.projetGPS || this.mapView) return;
    const { latitude, longitude } = this.projetGPS;
    this.mapView = L.map('mapView').setView([latitude, longitude], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.mapView);

    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);"></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });

    const marker = L.marker([latitude, longitude], { icon }).addTo(this.mapView);
    marker.bindPopup(`<strong>${this.projetGPS.titre}</strong><br>${this.projetGPS.organisationNom}`).openPopup();
    L.circle([latitude, longitude], { color: '#667eea', fillColor: '#667eea', fillOpacity: 0.2, radius: 200 }).addTo(this.mapView);
  }

  // ========================================
  // 📍 ACTIONS GPS
  // ========================================
  ouvrirDirections(): void {
    if (this.projetGPS) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${this.projetGPS.latitude},${this.projetGPS.longitude}`;
      window.open(url, '_blank');
    }
  }

  partagerLocalisation(): void {
    if (!this.projetGPS) return;
    const url = `https://www.google.com/maps?q=${this.projetGPS.latitude},${this.projetGPS.longitude}`;
    navigator.clipboard.writeText(url);
    alert('✅ Lien copié dans le presse-papier !');
  }

  copierCoordonnees(): void {
    if (!this.projetGPS) return;
    const coords = `${this.projetGPS.latitude}, ${this.projetGPS.longitude}`;
    navigator.clipboard.writeText(coords);
    alert(`✅ Coordonnées copiées: ${coords}`);
  }

  // ========================================
  // 🏷️ HELPER - Statut badge
  // ========================================
  getStatutClass(statut: string): string {
    if (statut === 'TERMINE') return 'badge-success';
    return 'badge-info';
  }

  getStatutLabel(statut: string): string {
    if (statut === 'TERMINE') return '✅ Terminé';
    return '⏳ En cours';
  }
}
