import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, EventEmitter, Inject, Input, Output, PLATFORM_ID } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-projet-create',
  standalone: true,
  imports: [
    CommonModule,   // ✅ obligatoire pour number, ngIf, ngFor
    FormsModule
  ],
  templateUrl: './projet-create.html',
  styleUrls: ['./projet-create.scss']
})
export class ProjetCreate implements AfterViewInit {

  // =============================
  // INPUT / OUTPUT
  // =============================
  @Input() submitting = false;
  @Output() projetCree = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  // =============================
  // FORM FIELDS
  // =============================
  titre = '';
  description = '';
  dateDebut = '';
  dateFin = '';
  urgent = false;

  // Type de projet
  typeActivite: 'GENERAL' | 'FINANCEMENT' | 'EVENEMENT' | 'PARRAINAGE' | 'NATURE' = 'GENERAL';

  montantFinancier: number | null = null;
  lieuEvenement = '';
  nombreBeneficiaires: number | null = null;

  // GPS
  latitude: number | null = null;
  longitude: number | null = null;

  tempLatitude: number | null = null;
  tempLongitude: number | null = null;

  showMapSelector = false;

  // Image
  imageFile: File | null = null;
  mediaPreview: string | null = null;

  // UI
  errorMessage = '';

  // =============================
  // TYPES DISPONIBLES
  // =============================
  typesDisponibles = [
    { value: 'GENERAL', label: '📋 Projet général' },
    { value: 'FINANCEMENT', label: '💰 Financement' },
    { value: 'EVENEMENT', label: '🎉 Événement' },
    { value: 'PARRAINAGE', label: '🤝 Parrainage' },
    { value: 'NATURE', label: '🌱 Don en nature' }
  ];

  // =============================
  // LEAFLET
  // =============================
  private L: any;
  private mapSelector: any;
  private marker: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // =============================
  // INIT MAP
  // =============================
  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const leaflet = await import('leaflet');
      this.L = leaflet.default;

      delete (this.L.Icon.Default.prototype as any)._getIconUrl;
      this.L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'assets/marker-icon-2x.png',
        iconUrl: 'assets/marker-icon.png',
        shadowUrl: 'assets/marker-shadow.png'
      });
    }
  }

  // =============================
  // FILE HANDLING
  // =============================
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;

    this.imageFile = file;

    const reader = new FileReader();
    reader.onload = () => (this.mediaPreview = String(reader.result));
    reader.readAsDataURL(file);
  }

  // =============================
  // FORM SUBMIT
  // =============================
  submit(form: NgForm) {
    if (!form.valid || this.submitting) return;

    if (this.latitude === null || this.longitude === null) {
      this.errorMessage = 'Veuillez sélectionner une position sur la carte.';
      return;
    }

    const user = this.authService.obtenirUtilisateurCourant();
    if (!user) {
      this.errorMessage = 'Utilisateur non authentifié';
      return;
    }

    const orgId = this.authService.getOrgId();
    if (!orgId) {
      this.errorMessage = 'Organisation introuvable. Veuillez vous reconnecter.';
      return;
    }

    const formData = new FormData();
    formData.append('titre', this.titre.trim());
    formData.append('description', this.description.trim());
    formData.append('dateDebut', this.dateDebut);
    formData.append('dateFin', this.dateFin || '');
    formData.append('urgent', String(this.urgent));
    formData.append('latitude', String(this.latitude));
    formData.append('longitude', String(this.longitude));
    formData.append('typeActivite', this.typeActivite);

    // Champs conditionnels
    if (this.typeActivite === 'FINANCEMENT' && this.montantFinancier !== null) {
      formData.append('montantFinancier', String(this.montantFinancier));
    }

    if (this.typeActivite === 'EVENEMENT' && this.lieuEvenement) {
      formData.append('lieuEvenement', this.lieuEvenement.trim());
    }

    if (this.typeActivite === 'PARRAINAGE' && this.nombreBeneficiaires !== null) {
      formData.append('nombreBeneficiaires', String(this.nombreBeneficiaires));
    }

    if (this.imageFile) {
      formData.append('image', this.imageFile, this.imageFile.name);
    }

    this.http.post(`${environment.apiUrl}/api/activites`, formData).subscribe({
      next: (res) => {
        this.errorMessage = '';
        this.projetCree.emit(res);
        this.reset(form);
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message || 'Erreur lors de la création du projet';
        console.error('[ProjetCreate] ❌', err);
      }
    });
  }

  // =============================
  // RESET
  // =============================
  reset(form: NgForm) {
    form.resetForm();
    this.mediaPreview = null;
    this.imageFile = null;
    this.latitude = null;
    this.longitude = null;
    this.tempLatitude = null;
    this.tempLongitude = null;
    this.typeActivite = 'GENERAL';
    this.montantFinancier = null;
    this.lieuEvenement = '';
    this.nombreBeneficiaires = null;
    this.errorMessage = '';
  }

  onCancel() {
    if (!this.submitting) {
      this.cancel.emit();
    }
  }

  // =============================
  // MAP MODAL
  // =============================
  ouvrirMapSelector() {
    this.tempLatitude = this.latitude ?? 33.5731;
    this.tempLongitude = this.longitude ?? -7.5898;
    this.showMapSelector = true;

    setTimeout(() => this.initMapSelector(), 100);
  }

  fermerCarteSelection() {
    this.showMapSelector = false;
    if (this.mapSelector) {
      this.mapSelector.remove();
      this.mapSelector = null;
    }
  }

  private async initMapSelector() {
    if (!this.L) {
      const leaflet = await import('leaflet');
      this.L = leaflet.default;
    }

    if (this.mapSelector) {
      this.mapSelector.invalidateSize();
      return;
    }

    this.mapSelector = this.L.map('mapSelector').setView(
      [this.tempLatitude!, this.tempLongitude!],
      13
    );

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.mapSelector);

    this.marker = this.L.marker(
      [this.tempLatitude!, this.tempLongitude!],
      { draggable: true }
    ).addTo(this.mapSelector);

    this.marker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng();
      this.tempLatitude = Number(pos.lat.toFixed(6));
      this.tempLongitude = Number(pos.lng.toFixed(6));
    });

    this.mapSelector.on('click', (e: any) => {
      this.tempLatitude = Number(e.latlng.lat.toFixed(6));
      this.tempLongitude = Number(e.latlng.lng.toFixed(6));
      this.marker.setLatLng([this.tempLatitude, this.tempLongitude]);
    });

    this.mapSelector.invalidateSize();
  }

  centrerSurMaPosition() {
    if (!navigator.geolocation) {
      alert('Géolocalisation non supportée');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.tempLatitude = Number(pos.coords.latitude.toFixed(6));
        this.tempLongitude = Number(pos.coords.longitude.toFixed(6));

        if (this.mapSelector) {
          this.mapSelector.setView(
            [this.tempLatitude, this.tempLongitude],
            15
          );
          this.marker?.setLatLng([this.tempLatitude, this.tempLongitude]);
        }
      },
      () => alert('Impossible d’obtenir la position')
    );
  }

  validerPosition() {
    if (this.tempLatitude === null || this.tempLongitude === null) {
      alert('Sélectionnez une position');
      return;
    }

    this.latitude = this.tempLatitude;
    this.longitude = this.tempLongitude;
    this.fermerCarteSelection();
  }
}
