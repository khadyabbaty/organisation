// src/app/services/don.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DonDetailDTO {
  nom: string;
  date: string;
  typeDon: 'FINANCIER' | 'EVENEMENTIEL' | 'NATURE' | 'PARRAINAGE';
  montant?: number;
  evenement?: string;
  lieu?: string;
  typeNature?: string;
  quantite?: number;
  typeLien?: string;
  nombreBeneficiaires?: number;
  details: string;
}

export interface ProjetDon {
  id: string;
  titre: string;
  description?: string;
  objectifFinancier?: number;
  montantRecolte?: number;
  pourcentage: number;
  nombreDonateurs?: number;
  donateurs: DonDetailDTO[];
}

@Injectable({ providedIn: 'root' })
export class DonService {
  private baseUrl = 'http://localhost:8080/api/dons';

  constructor(private http: HttpClient) {}

  // Récupérer tous les dons (si besoin)
  getAllDons(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  // Récupérer un don par ID
  getDonById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  // Récupérer les dons d'un projet spécifique
  getActiviteDons(activiteId: string): Observable<ProjetDon> {
    return this.http.get<ProjetDon>(`${this.baseUrl}/activite/${activiteId}`);
  }

}
