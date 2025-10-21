import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Organisation {
  id: number;
  nom: string;
  email: string;
  location: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrganisationService {

  private organisations: Organisation[] = [
    { id: 1, nom: 'Kheriyati', email: 'contact@kheriyati.org', location: 'Nouakchott' }
  ];

  constructor() { }

  // Retourne les infos de l’organisation connectée (simulation)
  getOrganisation(): Observable<Organisation> {
    return of(this.organisations[0]);
  }

  // Notifications simulées
  getNotifications(): Observable<any[]> {
    return of([
      { id: 1, message: 'Nouveau don reçu !', date: '2025-08-20' },
      { id: 2, message: 'Projet validé par admin', date: '2025-08-21' }
    ]);
  }
}
