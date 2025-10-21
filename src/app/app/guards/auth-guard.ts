// src/app/guards/auth-guard.ts
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

function base64UrlDecode(s: string): string {
  const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : '';
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

export function hasValidToken(): boolean {
  try {
    if (typeof window === 'undefined') return false;  // ✅ SSR
    const raw = localStorage.getItem('access_token');
    if (!raw) return false;
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const nowMs = Date.now();
    if (typeof payload.exp === 'number') return payload.exp * 1000 > nowMs;
    if (typeof payload.iat === 'number') return payload.iat * 1000 + 24*60*60*1000 > nowMs;
    return true;
  } catch {
    return false;
  }
}

// 🔁 utilise canMatch (recommandé pour bloquer l’accès au segment)
export const mustBeAuth: CanMatchFn = (): boolean | UrlTree => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return router.parseUrl('/login');  // SSR
  return hasValidToken() ? true : router.parseUrl('/login');
};
