// ========================================
// projet.ts (SERVICE - BACKEND FILTRE DÉJÀ)
// ========================================

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService, InfoUtilisateur } from './auth';

export interface ActiviteUpsert {
  titre: string;
  dateDebut: string;
  dateFin?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  organisationId?: string;
  image?: File | null;
  urgent?: boolean;
}

interface ActiviteApi {
  id: string;
  titre: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  lieu?: string;
  image?: string;
  organisationId?: string | null;
  organisationNom?: string | null;
  urgent?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface Projet {
  id: string | number;
  titre: string;
  description: string;
  statut: 'EN_COURS' | 'TERMINE';
  dateCreation: Date;
  organisationNom: string;
  organisationId?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  urgent?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ProjetsApi {
  private readonly api = (environment.apiUrl || '').replace(/\/+$/, '');
  private readonly base = `${this.api}/api/activites`;
  private authService = inject(AuthService);

  constructor(private http: HttpClient) {}

  // ========================================
  // TOKEN MANAGEMENT
  // ========================================
  private getToken(): string | null {
    const raw = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!raw) return null;
    return raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  }

  private authHeaders(base?: HttpHeaders): HttpHeaders {
    let h = base || new HttpHeaders();
    const t = this.getToken();
    if (t) h = h.set('Authorization', `Bearer ${t}`);
    return h;
  }

  // ========================================
  // USER INFO
  // ========================================
  private getCurrentUserInfo(): InfoUtilisateur | null {
    return this.authService.obtenirUtilisateurCourant();
  }

  // ========================================
  // MEDIA URL HELPERS
  // ========================================
  private basename(p?: string): string {
    if (!p) return '';
    const s = String(p).trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const last = s.split('/').pop() || '';
    return last.includes(':') ? last.split(':').pop()!.split('/').pop()! : last;
  }

  private resolveMediaUrl(image?: string): string {
    const api = (environment.apiUrl || '').replace(/\/+$/, '');
    if (!image) return 'assets/default-project.jpg';

    const val = String(image).trim();
    if (/^https?:\/\//i.test(val)) return val;
    if (val.startsWith('/uploads/activites/')) return `${api}${val}`;

    const file = this.basename(val);
    if (!file) return 'assets/default-project.jpg';
    return `${api}/uploads/activites/${encodeURIComponent(file)}`;
  }

  private pickImageField(a: any): string {
    return a?.image ?? a?.imageUrl ?? a?.photo ?? a?.media ?? a?.filename ?? '';
  }

  // ========================================
  // MAPPING
  // ========================================
  private toProjet(a: any): Projet {
    const d0 = a?.dateDebut ? new Date(a.dateDebut) : new Date();
    const d1 = a?.dateFin ? new Date(a.dateFin) : undefined;

    const statut: 'EN_COURS' | 'TERMINE' =
      d1 ? (new Date() > d1 ? 'TERMINE' : 'EN_COURS') : 'EN_COURS';

    const raw = this.pickImageField(a);
    const mediaUrl = this.resolveMediaUrl(raw);
    const ext = this.basename(raw).split('.').pop()?.toLowerCase();

    const mediaType: 'image' | 'video' =
      ext && ['mp4', 'webm', 'ogg', 'mov'].includes(ext) ? 'video' : 'image';

    return {
      id: a.id,
      titre: a.titre ?? '—',
      description: a.description ?? '',
      statut,
      dateCreation: d0,
      organisationNom: a.organisationNom ?? a.organisation?.nom ?? '—',
      organisationId: a.organisationId ?? a.organisation?.id ?? undefined,
      mediaUrl,
      mediaType,
      urgent: !!a.urgent,
      latitude: a.latitude != null ? Number(a.latitude) : null,
      longitude: a.longitude != null ? Number(a.longitude) : null
    };
  }

  // ========================================
  // PUBLIC API METHODS
  // ========================================

  /** ✅ GET - PROJETS (Le backend filtre déjà par organisation) */
  getAllMine(): Observable<Projet[]> {
    const currentUser = this.getCurrentUserInfo();

    if (!currentUser) {
      console.error('❌ [ProjetsApi] Aucun utilisateur connecté');
      return throwError(() => new Error('Utilisateur non authentifié'));
    }

    const headers = this.authHeaders();
    console.log(`🔒 [ProjetsApi] Récupération des projets pour: ${currentUser.orgId || currentUser.username}`);

    // ✅ LE BACKEND FILTRE DÉJÀ PAR ORGANISATION
    // Pas besoin de filtrer côté client
    return this.http.get<ActiviteApi[]>(this.base, { headers }).pipe(
      map(list => {
        console.log(`📥 [ProjetsApi] ${list?.length || 0} projets reçus du serveur`);
        return (list ?? []).map(row => this.toProjet(row));
      }),
      tap(projets => {
        console.log(`✅ [ProjetsApi] ${projets.length} projet(s) chargé(s)`);
      })
    );
  }

  /** ✅ CREATE - Associé à l'utilisateur courant */
  create(p: ActiviteUpsert): Observable<Projet> {
    const currentUser = this.getCurrentUserInfo();

    if (!currentUser) {
      return throwError(() => new Error('Utilisateur non authentifié'));
    }

    const payload: ActiviteUpsert = {
      ...p,
      organisationId: currentUser.orgId || currentUser.organisationId || undefined
    };

    const fd = this.toFormData(payload);
    const headers = this.authHeaders();

    console.log(`🔒 [ProjetsApi] Création de projet pour orgId: ${payload.organisationId}`);

    return this.http.post<ActiviteApi>(this.base, fd, { headers }).pipe(
      map(a => this.toProjet(a))
    );
  }

  /** ✅ UPDATE */
  update(id: string | number, p: ActiviteUpsert): Observable<Projet> {
    const currentUser = this.getCurrentUserInfo();

    if (!currentUser) {
      return throwError(() => new Error('Utilisateur non authentifié'));
    }

    const payload: ActiviteUpsert = {
      ...p,
      organisationId: currentUser.orgId || currentUser.organisationId || undefined
    };

    const fd = this.toFormData(payload);
    const headers = this.authHeaders();

    console.log(`🔒 [ProjetsApi] Mise à jour du projet ${id}`);

    return this.http.put<ActiviteApi>(`${this.base}/${id}`, fd, { headers }).pipe(
      map(a => this.toProjet(a))
    );
  }

  /** ✅ DELETE */
  delete(id: string | number): Observable<void> {
    const currentUser = this.getCurrentUserInfo();

    if (!currentUser) {
      return throwError(() => new Error('Utilisateur non authentifié'));
    }

    const headers = this.authHeaders();
    console.log(`🔒 [ProjetsApi] Suppression du projet ${id}`);

    return this.http.delete<void>(`${this.base}/${id}`, { headers });
  }

  // ========================================
  // FORMDATA HELPER
  // ========================================
  private toFormData(p: ActiviteUpsert): FormData {
    const fd = new FormData();
    fd.append('titre', p.titre);
    fd.append('dateDebut', p.dateDebut);
    if (p.dateFin) fd.append('dateFin', p.dateFin);
    if (p.description) fd.append('description', p.description);
    if (p.latitude != null) fd.append('latitude', String(p.latitude));
    if (p.longitude != null) fd.append('longitude', String(p.longitude));
    if (p.organisationId) fd.append('organisationId', p.organisationId);
    if (p.image) fd.append('image', p.image);
    if (typeof p.urgent === 'boolean') fd.append('urgent', String(p.urgent));
    return fd;
  }
}
