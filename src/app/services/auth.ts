import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ConnexionPayload {
  username: string;
  password: string;
}

export interface ConnexionResponse {
  token: string;
  refreshToken?: string;
  username: string;
  email?: string;
  profil?: string;
  organisationId?: string | null;
  organisationNom?: string | null;
}

export interface InscriptionPayload {
  username: string;
  password: string;
  email: string;
  adresse?: string;
  telephone?: string;
  profil?: string;
  organisationNom?: string;  // ✅ NOUVEAU
}

export interface InfoUtilisateur {
  id?: string | number;
  username: string;
  email?: string;
  profil?: string;
  orgId?: string | null;
  organisationId?: string | null;
  organisationNom?: string | null;
  roles?: string[];
  adresse?: string;
  telephone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {
    console.log('[AuthService] ✅ Initialisé');
  }

  // ========================================
  // 🔧 HELPER : Convertir chaîne vide en null
  // ========================================
  private normalizeOrgId(value: any): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    return str === '' ? null : str;
  }

  // ========================================
  // 🔐 CONNEXION
  // ========================================
  connexion(payload: ConnexionPayload): Observable<ConnexionResponse> {
    console.log('[AuthService] 🔐 Connexion:', payload.username);

    return this.http.post<ConnexionResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((res) => {
        console.log('[AuthService] ✅ Token reçu:', res.token.substring(0, 20) + '...');

        // ✅ Sauvegarder le token
        localStorage.setItem('access_token', res.token);
        if (res.refreshToken) {
          localStorage.setItem('refresh_token', res.refreshToken);
        }

        // ✅ Décoder le token
        const decodedToken = this.decodeToken(res.token);
        console.log('[AuthService] 🔍 Token décodé:', decodedToken);

        // ✅ CORRECTION: Normaliser les chaînes vides en null
        const orgId = this.normalizeOrgId(res.organisationId ?? decodedToken?.orgId);
        const orgNom = this.normalizeOrgId(res.organisationNom ?? decodedToken?.orgNom);

        const userInfo: InfoUtilisateur = {
          username: res.username || decodedToken?.sub || '',
          email: res.email || decodedToken?.email || '',
          profil: res.profil || decodedToken?.profil || '',

          // ✅ Utiliser la valeur normalisée (null si vide)
          orgId: orgId,
          organisationId: orgId,
          organisationNom: orgNom,

          roles: decodedToken?.roles || [],
          id: decodedToken?.sub || decodedToken?.userId || ''
        };

        console.log('[AuthService] 👤 Utilisateur complet sauvegardé:', userInfo);

        // ✅ Log spécifique pour l'organisation
        if (userInfo.orgId) {
          console.log('[AuthService] 🏢 Organisation:', userInfo.organisationNom, '(ID:', userInfo.orgId + ')');
        } else {
          console.log('[AuthService] ⚠️ Pas d\'organisation associée (orgId = null)');
        }

        // ✅ Sauvegarder les infos utilisateur
        localStorage.setItem('user_info', JSON.stringify(userInfo));

        console.log('[AuthService] 💾 Données sauvegardées');
      })
    );
  }

  // ========================================
  // 📝 INSCRIPTION
  // ========================================
  inscrire(payload: InscriptionPayload): Observable<any> {
    console.log('[AuthService] 📝 Inscription:', payload.username);
    return this.http.post(`${this.apiUrl}/inscription`, payload).pipe(
      tap(res => console.log('[AuthService] ✅ Inscription réussie'))
    );
  }

  // ========================================
  // 🚪 DÉCONNEXION
  // ========================================
  deconnexion(): void {
    console.log('[AuthService] 🚪 Déconnexion');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
  }

  // ========================================
  // ✅ EST AUTHENTIFIÉ
  // ========================================
  estAuthentifie(): boolean {
    const token = this.obtenirJeton();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() < payload.exp * 1000;
    } catch {
      return false;
    }
  }

  // ========================================
  // 🔑 OBTENIR TOKEN
  // ========================================
  obtenirJeton(): string | null {
    return localStorage.getItem('access_token') || null;
  }

  // ========================================
  // 👤 OBTENIR UTILISATEUR COURANT
  // ========================================
  obtenirUtilisateur(): InfoUtilisateur | null {
    try {
      const user = localStorage.getItem('user_info');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  obtenirUtilisateurCourant(): InfoUtilisateur | null {
    return this.obtenirUtilisateur();
  }

  // ========================================
  // 🔍 DÉCODER LE TOKEN JWT
  // ========================================
  decodeToken(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[AuthService] ❌ Token invalide (format incorrect)');
      return null;
    }
    try {
      const decoded = JSON.parse(atob(parts[1]));
      console.log('[AuthService] 🔓 Token décodé avec succès');
      return decoded;
    } catch (err) {
      console.error('[AuthService] ❌ Erreur décodage token:', err);
      return null;
    }
  }

  // ========================================
  // 🏢 OBTENIR L'ID ORGANISATION
  // ========================================
  getOrgId(): string | null {
    const user = this.obtenirUtilisateurCourant();
    if (user?.orgId) {
      return user.orgId;
    }

    // ✅ Fallback: Décoder le token directement
    const token = this.obtenirJeton();
    if (!token) return null;

    const decoded = this.decodeToken(token);
    return this.normalizeOrgId(decoded?.orgId);
  }

  // ========================================
  // 🔄 RAFRAÎCHIR LES INFOS UTILISATEUR
  // ========================================
  rafraichirUtilisateur(): void {
    const token = this.obtenirJeton();
    if (!token) return;

    const decoded = this.decodeToken(token);
    if (decoded) {
      const orgId = this.normalizeOrgId(decoded?.orgId);
      const orgNom = this.normalizeOrgId(decoded?.orgNom);

      const userInfo: InfoUtilisateur = {
        username: decoded.sub || decoded.username || '',
        email: decoded.email || '',
        profil: decoded.profil || '',
        orgId: orgId,
        organisationId: orgId,
        organisationNom: orgNom,
        roles: decoded.roles || [],
        id: decoded.sub || decoded.userId || ''
      };

      localStorage.setItem('user_info', JSON.stringify(userInfo));
      console.log('[AuthService] 🔄 Utilisateur rafraîchi:', userInfo);
    }
  }
}
