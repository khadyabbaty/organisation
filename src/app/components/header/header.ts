// src/app/components/header/header.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { ProjetCreate, ProjetCreateOutput } from '../projet-create/projet-create';
import { ActiviteUpsert, ProjetsApi } from '../../services/projet';
import { environment } from '../../../environments/environment';

import { of, concat } from 'rxjs';
import { catchError, filter, map, switchMap, take, tap } from 'rxjs/operators';

const isBrowser = typeof window !== 'undefined';
const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ''));

function lsGet(k: string): string | null { try { return isBrowser ? localStorage.getItem(k) : null; } catch { return null; } }
function lsSet(k: string, v: string) { try { if (isBrowser) localStorage.setItem(k, v); } catch {} }

/** Tente d'extraire un orgId depuis le JWT stocké dans localStorage('access_token') */
function parseJwtOrgId(): string {
  try {
    const raw = lsGet('access_token'); if (!raw) return '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    const [, payloadB64] = token.split('.'); if (!payloadB64) return '';
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const p = JSON.parse(json);
    // essaie plusieurs clés possibles
    return String(
      p.orgId ??
      p.org_id ??
      p.organisationId ??
      p.organisation_id ??
      p.organisation?.id ??
      ''
    );
  } catch { return ''; }
}

/** Normalise diverses formes de réponse en un id */
function extractOrgId(shape: any): string {
  if (!shape) return '';
  if (typeof shape === 'string') return shape;
  if (Array.isArray(shape)) return extractOrgId(shape[0]);
  if (typeof shape === 'object') {
    return String(
      shape.id ??
      shape.uuid ??
      shape.organisation?.id ??
      shape.data?.id ??
      ''
    );
  }
  return '';
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterModule, FormsModule, ProjetCreate],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header {
  private api = inject(ProjetsApi);
  private router = inject(Router);
  private http = inject(HttpClient);

  menuOpen = false;
  modalOpen = false;
  submitting = false;

  get showPrivateNav(): boolean {
    const url = this.router.url;
    return !(url.startsWith('/login') || url.startsWith('/register') || url.startsWith('/forgot-password'));
  }

  toggleMenu() { this.menuOpen = !this.menuOpen; }
  closeMenu() { this.menuOpen = false; }

  createProjet() { this.modalOpen = true; }
  closeModal() { if (!this.submitting) this.modalOpen = false; }

  private todayISO(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** Résout un orgId valide : cache -> JWT -> endpoints connus -> cache */
  private getOrgId$() {
    // 1) cache
    const cached = lsGet('orgId');
    if (isUuid(cached || '')) return of(cached as string);

    // 2) JWT
    const fromJwt = parseJwtOrgId();
    if (isUuid(fromJwt)) { lsSet('orgId', fromJwt); return of(fromJwt); }

    // 3) endpoints possibles (adapte si besoin à ton back)
    const base = environment.apiUrl;
    const candidates = [
      `${base}/api/organisations/me`,
      `${base}/api/mes-organisations`,
      `${base}/api/organisations/current`,
      `${base}/api/organisations` // liste complète
    ];

    const streams = candidates.map(url =>
      this.http.get<any>(url).pipe(
        map(res => extractOrgId(res)),
        map(id => (isUuid(id) ? id : '')),
        catchError(() => of(''))
      )
    );

    // essaie en série, prend le premier id non vide, le met en cache
    return concat(...streams).pipe(
      filter(id => !!id),
      take(1),
      tap(id => lsSet('orgId', id)),
      catchError(() => { throw new Error('ORG_NOT_RESOLVED'); })
    );
  }

  handleProjetCree(ev: ProjetCreateOutput) {
    this.submitting = true;

    this.getOrgId$().pipe(
      switchMap(orgId => this.api.create({
        titre: ev.titre,
        dateDebut: ev.dateDebut || this.todayISO(),
        dateFin: ev.dateFin,
        description: ev.description,
        latitude: Number(ev.latitude),   // ✅ OBLIGATOIRE
    longitude: Number(ev.longitude), // ✅ OBLIGATOIRE

        image: ev.imageFile ?? null,
        organisationId: orgId // lié côté back → permettra d'afficher le nom d'orga
      } as ActiviteUpsert))
    ).subscribe({
      next: () => {
        this.submitting = false;
        this.modalOpen = false;
        alert('Projet créé ✅');
        this.router.navigateByUrl('/dashboard');
      },
      error: (e) => {
        this.submitting = false;
        const msg =
          e?.message === 'ORG_NOT_RESOLVED'
            ? 'Organisation non résolue : aucune route ne renvoie un ID.'
            : `Création échouée (${e?.status || '—'})`;
        alert(msg);
        console.error('getOrgId$ / create error:', e);
      }
    });
  }
}
