import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DonStats {
  financier: number;
  nature: number;
  parrainage: number;
  evenementiel: number;
}

@Injectable({ providedIn: 'root' })
export class DonService {
  private base = '/api/dons';
  constructor(private http: HttpClient) {}

  getStats(): Observable<DonStats> {
    return this.http.get<DonStats>(`${this.base}/stats`);
  }
}
