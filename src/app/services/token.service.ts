// src/app/services/token.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly AT = 'access_token';
  private readonly RT = 'refresh_token';

  private get storage(): Storage | null {
    try { return typeof window !== 'undefined' ? window.localStorage : null; }
    catch { return null; }
  }

  setTokens(accessToken?: string | null, refreshToken?: string | null): void {
    const s = this.storage; if (!s) return;
    // ⚠️ n’écris JAMAIS une chaîne vide / "null" / "undefined"
    if (accessToken && accessToken !== 'null' && accessToken !== 'undefined') s.setItem(this.AT, accessToken);
    else s.removeItem(this.AT);

    if (refreshToken && refreshToken !== 'null' && refreshToken !== 'undefined') s.setItem(this.RT, refreshToken);
    else s.removeItem(this.RT);
  }

  get accessToken(): string | null {
    const v = this.storage?.getItem(this.AT) ?? null;
    if (!v || v === 'null' || v === 'undefined' || !v.includes('.')) return null;
    return v;
  }

  clear(): void {
    this.storage?.removeItem(this.AT);
    this.storage?.removeItem(this.RT);
  }

  /** vrai SI et seulement si JWT présent et non expiré */
  hasValidToken(): boolean {
    const t = this.accessToken;
    if (!t) return false;
    try {
      const [, p] = t.split('.');
      if (!p) return false;
      const json = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(json);
      if (typeof payload.exp === 'number') {
        const now = Math.floor(Date.now() / 1000);
        if (now >= payload.exp) { this.clear(); return false; }
      }
      return true;
    } catch {
      this.clear();
      return false;
    }
  }
}
