import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, switchMap, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';

const HEADER_ORG = 'X-ORGANISATION-ID';
const ORG_STORAGE_KEY = 'orgId';

export interface ActiviteUpsert {
  titre: string;
  dateDebut: string;      // YYYY-MM-DD
  dateFin?: string;
  description?: string;
  lieu?: string;
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
  organisation?: { id: string; nom: string } | null;
  urgent?: boolean;
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
}

@Injectable({ providedIn: 'root' })
export class ProjetsApi {
  private readonly api = (environment.apiUrl || '').replace(/\/+$/, '');
  private readonly base = `${this.api}/api/activites`;

  constructor(private http: HttpClient) {}

  /* ---------------- Token Helper ---------------- */
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

  /* ---------------- Organization ID Cache ---------------- */
  private get cachedOrgId(): string | null {
    try {
      return localStorage.getItem(ORG_STORAGE_KEY) || sessionStorage.getItem(ORG_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private set cachedOrgId(v: string | null) {
    try {
      if (v) localStorage.setItem(ORG_STORAGE_KEY, v);
      else localStorage.removeItem(ORG_STORAGE_KEY);
    } catch {}
  }

  /** Fetch orgId from /auth/me and cache it */
  private ensureOrgId$(): Observable<string> {
    const cached = this.cachedOrgId;
    if (cached) return of(cached);

    const headers = this.authHeaders();
    return this.http.get<any>(`${this.api}/auth/me`, { headers }).pipe(
      map(r => {
        console.log('[ProjetsApi] /auth/me response:', r);

        // Try different possible field names for organization ID
        const orgId = r?.orgId ||
                     r?.organisationId ||
                     r?.organization?.id ||
                     r?.organisation?.id ||
                     r?.user?.orgId ||
                     r?.user?.organisationId ||
                     '';

        console.log('[ProjetsApi] Extracted orgId:', orgId);
        return orgId;
      }),
      tap(id => {
        if (!id) {
          console.error('[ProjetsApi] orgId not found in /auth/me response');
          throw new Error('orgId absent dans /auth/me');
        }
      }),
      tap(id => {
        console.log('[ProjetsApi] Caching orgId:', id);
        this.cachedOrgId = id;
      })
    );
  }

  /* ---------------- Media URL Helpers ---------------- */
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

  /* ---------------- Mapping ---------------- */
  private toProjet(a: any): Projet {
    const d0 = a?.dateDebut ? new Date(a.dateDebut) : new Date();
    const d1 = a?.dateFin ? new Date(a.dateFin) : undefined;
    const statut: 'EN_COURS' | 'TERMINE' = d1 ? (new Date() > d1 ? 'TERMINE' : 'EN_COURS') : 'EN_COURS';

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
      organisationNom: a.organisation?.nom ?? '—',
      organisationId: a.organisation?.id ?? undefined,
      mediaUrl,
      mediaType,
      urgent: !!a.urgent
    };
  }

  /* ---------------- Public API Methods ---------------- */

  /** Get all projects for current organization */
  getAllMine(): Observable<Projet[]> {
    return this.ensureOrgId$().pipe(
      switchMap(orgId => {
        let headers = this.authHeaders();
        headers = headers.set(HEADER_ORG, orgId);

        console.log('[ProjetsApi] Fetching projects with orgId:', orgId);
        console.log('[ProjetsApi] Request URL:', this.base);
        console.log('[ProjetsApi] Headers:', headers.keys());

        return this.http.get<ActiviteApi[]>(this.base, { headers });
      }),
      map(list => {
        console.log('[ProjetsApi] Received projects:', list?.length || 0);
        return (list ?? []).map(row => this.toProjet(row));
      })
    );
  }

  /** Get all projects (admin only - scope=all) */
  getAllScopeAll(): Observable<Projet[]> {
    const headers = this.authHeaders();
    return this.http.get<ActiviteApi[]>(`${this.base}?scope=all`, { headers }).pipe(
      map(list => (list ?? []).map(row => this.toProjet(row)))
    );
  }

  /** Create new project */
  create(p: ActiviteUpsert): Observable<Projet> {
    return this.ensureOrgId$().pipe(
      switchMap(orgId => {
        const fd = this.toFormData({ ...p, organisationId: p.organisationId ?? orgId });
        let headers = this.authHeaders();
        headers = headers.set(HEADER_ORG, orgId);
        return this.http.post<ActiviteApi>(this.base, fd, { headers });
      }),
      map(a => this.toProjet(a))
    );
  }

  /** Update existing project */
  update(id: string | number, p: ActiviteUpsert): Observable<Projet> {
    return this.ensureOrgId$().pipe(
      switchMap(orgId => {
        const fd = this.toFormData({ ...p, organisationId: p.organisationId ?? orgId });
        let headers = this.authHeaders();
        headers = headers.set(HEADER_ORG, orgId);
        return this.http.put<ActiviteApi>(`${this.base}/${id}`, fd, { headers });
      }),
      map(a => this.toProjet(a))
    );
  }

  /** Delete project */
  delete(id: string | number): Observable<void> {
    return this.ensureOrgId$().pipe(
      switchMap(orgId => {
        let headers = this.authHeaders();
        headers = headers.set(HEADER_ORG, orgId);
        return this.http.delete<void>(`${this.base}/${id}`, { headers });
      })
    );
  }

  /* ---------------- FormData Helper ---------------- */
  private toFormData(p: ActiviteUpsert): FormData {
    const fd = new FormData();
    fd.append('titre', p.titre);
    fd.append('dateDebut', p.dateDebut);
    if (p.dateFin) fd.append('dateFin', p.dateFin);
    if (p.description) fd.append('description', p.description);
    if (p.lieu) fd.append('lieu', p.lieu);
    if (p.organisationId) fd.append('organisationId', p.organisationId);
    if (p.image) fd.append('image', p.image);
    if (typeof p.urgent === 'boolean') fd.append('urgent', String(p.urgent));
    return fd;
  }
}
