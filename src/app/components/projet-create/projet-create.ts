import { Component, EventEmitter, Input, Output, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';

export interface ProjetCreateOutput {
  titre: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  latitude?: number;
  longitude?: number;
  imageFile?: File | null;
  urgent?: boolean;
}

@Component({
  selector: 'app-projet-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projet-create.html',
  styleUrls: ['./projet-create.scss']
})
export class ProjetCreate implements AfterViewInit {
  @Input() submitting = false;
  @Output() projetCree = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  titre = '';
  description = '';
  dateDebut = '';
  dateFin = '';
  urgent = false;

  latitude: number | null = null;
  longitude: number | null = null;

  imageFile: File | null = null;
  mediaPreview: string | null = null;
  errorMessage = '';

  // GPS Modal
  showMapSelector = false;
  tempLatitude: number = 33.5731;
  tempLongitude: number = -7.5898;

  private map: any;
  private marker: any;
  private mapSelector: any;
  private L: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const leaflet = await import('leaflet');
      this.L = leaflet.default;

      // Fix pour les icônes Leaflet
      delete (this.L.Icon.Default.prototype as any)._getIconUrl;
      this.L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'assets/marker-icon-2x.png',
        iconUrl: 'assets/marker-icon.png',
        shadowUrl: 'assets/marker-shadow.png',
      });
    }
  }

  // ========================================
  // FILE HANDLING
  // ========================================
  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;

    this.imageFile = file;
    const reader = new FileReader();
    reader.onload = () => this.mediaPreview = String(reader.result);
    reader.readAsDataURL(file);
  }

  // ========================================
  // FORM SUBMISSION - ENVOIE FORMDATA
  // ========================================
  submit(form: NgForm) {
    if (!form.valid || this.submitting) return;

    if (this.latitude == null || this.longitude == null) {
      this.errorMessage = 'Veuillez sélectionner votre position sur la carte.';
      return;
    }

    // ✅ Obtenir l'utilisateur courant
    const user = this.authService.obtenirUtilisateurCourant();

    if (!user) {
      this.errorMessage = 'Utilisateur non authentifié';
      console.error('[ProjetCreate] ❌ Pas d\'utilisateur');
      return;
    }

    // ✅ Obtenir l'orgId (le service gère les fallbacks)
    const orgId = this.authService.getOrgId();

    if (!orgId) {
      console.error('[ProjetCreate] ❌ Organisation non trouvée. User:', user);
      this.errorMessage = 'Organisation introuvable pour cet utilisateur. Veuillez vous reconnecter.';
      return;
    }

    console.log('[ProjetCreate] ✅ Création du projet - OrgId:', orgId);

    // ✅ Créer FormData
    const formData = new FormData();
    formData.append('titre', this.titre.trim());
    formData.append('description', this.description.trim());
    formData.append('dateDebut', this.dateDebut);
    formData.append('dateFin', this.dateFin || '');
    formData.append('latitude', String(this.latitude));
    formData.append('longitude', String(this.longitude));

    // Ajouter l'image si présente
    if (this.imageFile) {
      formData.append('image', this.imageFile, this.imageFile.name);
      console.log('[ProjetCreate] Image ajoutée:', this.imageFile.name);
    }

    // ✅ LOG: Afficher tout ce qui est envoyé
    console.log('[ProjetCreate] === FORMULAIRE COMPLET ===');
    console.log('[ProjetCreate] Titre:', this.titre);
    console.log('[ProjetCreate] Description:', this.description);
    console.log('[ProjetCreate] Date Début:', this.dateDebut);
    console.log('[ProjetCreate] Date Fin:', this.dateFin);
    console.log('[ProjetCreate] Latitude:', this.latitude);
    console.log('[ProjetCreate] Longitude:', this.longitude);
    console.log('[ProjetCreate] Image:', this.imageFile?.name || 'AUCUNE');
    console.log('[ProjetCreate] ===========================');

    // ✅ Envoyer au backend (WITHOUT manual Authorization header - interceptor ajoute automatiquement)
    this.http.post(
      `${environment.apiUrl}/api/activites`,
      formData
      // ⚠️ NE PAS mettre de headers ici - Angular détecte FormData et accepte multipart/form-data
    ).subscribe({
      next: (response) => {
        console.log('[ProjetCreate] ✅ Succès:', response);
        this.errorMessage = '';
        this.projetCree.emit({
          ...response,
          success: true
        });
        this.reset(form);
      },
      error: (err) => {
        console.error('[ProjetCreate] ❌ Erreur:', err);
        console.error('[ProjetCreate] 📋 Réponse serveur:', err.error);
        this.errorMessage = err?.error?.message || 'Erreur lors de la création du projet';
      }
    });
  }

  reset(form: NgForm) {
    form.resetForm();
    this.mediaPreview = null;
    this.imageFile = null;
    this.latitude = null;
    this.longitude = null;
    this.errorMessage = '';
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
  }

  onCancel() {
    if (!this.submitting) this.cancel.emit();
  }

  // ========================================
  // GPS MAP SELECTOR - OUVERTURE
  // ========================================
  ouvrirMapSelector() {
    console.log('🗺️ Ouverture de la sélection GPS');
    this.tempLatitude = this.latitude || 33.5731;
    this.tempLongitude = this.longitude || -7.5898;
    this.showMapSelector = true;
    setTimeout(() => this.initMapSelector(), 100);
  }

  fermerCarteSelection() {
    console.log('❌ Fermeture de la sélection GPS');
    this.showMapSelector = false;
    if (this.mapSelector) {
      this.mapSelector.remove();
      this.mapSelector = null;
    }
  }

  // ========================================
  // GPS MAP SELECTOR - INITIALISATION
  // ========================================
  private async initMapSelector() {
    if (!this.L) {
      const leaflet = await import('leaflet');
      this.L = leaflet.default;
    }

    if (this.mapSelector) {
      this.mapSelector.invalidateSize();
      return;
    }

    console.log(`📍 Initialisation de la carte (${this.tempLatitude}, ${this.tempLongitude})`);

    this.mapSelector = this.L.map('mapSelector').setView(
      [this.tempLatitude, this.tempLongitude],
      13
    );

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.mapSelector);

    const icon = this.L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);"></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });

    this.marker = this.L.marker(
      [this.tempLatitude, this.tempLongitude],
      { icon, draggable: true }
    ).addTo(this.mapSelector);

    this.marker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng();
      this.tempLatitude = Number(pos.lat.toFixed(6));
      this.tempLongitude = Number(pos.lng.toFixed(6));
      console.log(`📍 Marqueur déplacé: ${this.tempLatitude}, ${this.tempLongitude}`);
    });

    this.mapSelector.on('click', (e: any) => {
      this.tempLatitude = Number(e.latlng.lat.toFixed(6));
      this.tempLongitude = Number(e.latlng.lng.toFixed(6));
      this.marker.setLatLng([this.tempLatitude, this.tempLongitude]);
      console.log(`📍 Position mise à jour: ${this.tempLatitude}, ${this.tempLongitude}`);
    });

    this.mapSelector.on('moveend', () => {
      const center = this.mapSelector.getCenter();
      this.tempLatitude = Number(center.lat.toFixed(6));
      this.tempLongitude = Number(center.lng.toFixed(6));
      console.log(`🎯 Centré sur: ${this.tempLatitude}, ${this.tempLongitude}`);
    });

    this.mapSelector.invalidateSize();
  }

  // ========================================
  // GPS MAP SELECTOR - CENTRER SUR MA POSITION
  // ========================================
  centrerSurMaPosition() {
    console.log('🎯 Localisation en cours...');

    if (!navigator.geolocation) {
      alert('❌ Géolocalisation non supportée');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));

        console.log(`✅ Position obtenue: ${lat}, ${lng}`);

        this.tempLatitude = lat;
        this.tempLongitude = lng;

        if (this.mapSelector) {
          this.mapSelector.setView([lat, lng], 15);

          if (this.marker) {
            this.marker.setLatLng([lat, lng]);
          } else {
            const icon = this.L.divIcon({
              className: 'custom-marker',
              html: `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);"></div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 40]
            });
            this.marker = this.L.marker([lat, lng], { icon, draggable: true }).addTo(this.mapSelector);
          }
        }

        alert('✅ Position actuelle localisée !');
      },
      (error) => {
        console.error('❌ Erreur de géolocalisation:', error);
        alert('❌ Impossible d\'obtenir votre position. Vérifiez les permissions.');
      }
    );
  }

  // ========================================
  // GPS MAP SELECTOR - VALIDER LA POSITION
  // ========================================
  validerPosition() {
    if (!this.tempLatitude || !this.tempLongitude) {
      alert('❌ Sélectionnez une position sur la carte');
      return;
    }

    console.log(`✅ Position validée: ${this.tempLatitude}, ${this.tempLongitude}`);

    this.latitude = this.tempLatitude;
    this.longitude = this.tempLongitude;

    this.fermerCarteSelection();

    alert('✅ Position GPS enregistrée !');
  }
}
