import { Component, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgChartsModule], // on garde NgCharts ici
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard {

  // ✅ Garde SSR
  isBrowser = false;
  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  statistiques = [
    { titre: 'Total Projets', valeur: 12, icone: 'bi-folder-fill', fond: 'stat-blue' },
    { titre: 'Total Dons', valeur: 34, icone: 'bi-heart-fill', fond: 'stat-green' },
    { titre: 'Montant Dons', valeur: 5600, icone: 'bi-cash-coin', fond: 'stat-orange' },
    { titre: 'Projets Financiers', valeur: 5, icone: 'bi-cash-stack', fond: 'stat-purple' },
    { titre: 'Projets Nature', valeur: 3, icone: 'bi-tree-fill', fond: 'stat-teal' },
    { titre: 'Projets Parrainage', valeur: 2, icone: 'bi-people-fill', fond: 'stat-coral' },
    { titre: 'Projets Événementiels', valeur: 2, icone: 'bi-calendar-event-fill', fond: 'stat-red' }
  ];

  // TYPES
  chartDonneesMensuellesDonsType: 'doughnut' = 'doughnut';
  chartRepartitionParProjetType: 'pie' = 'pie';
  chartDonsLineChartType: 'line' = 'line';
  chartProjetsRadarType: 'radar' = 'radar';
  chartDonsPolarAreaType: 'polarArea' = 'polarArea';
  chartDonsDoughnutType: 'doughnut' = 'doughnut';

  // DONNÉES
  donneesMensuellesDons: ChartData<'doughnut'> = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai'],
    datasets: [{ data: [120, 150, 180, 90, 200], backgroundColor: ['#007bff', '#28a745', '#ffc107', '#ff7f50', '#6f42c1'] }]
  };
  optionsDonneesMensuelles: ChartOptions<'doughnut'> = { responsive: true };

  repartitionParProjet: ChartData<'pie'> = {
    labels: ['Projet A', 'Projet B', 'Projet C'],
    datasets: [{ data: [40, 25, 35], backgroundColor: ['#007bff', '#28a745', '#ff7f50'] }]
  };
  optionsRepartitionProjet: ChartOptions<'pie'> = { responsive: true };

  donsLineChartData: ChartData<'line'> = {
    labels: ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4'],
    datasets: [
      { data: [300, 450, 500, 700], label: 'Progression des Dons', fill: true, borderColor: '#28a745', backgroundColor: 'rgba(40,167,69,0.2)', tension: 0.3 }
    ]
  };
  donsLineChartOptions: ChartOptions<'line'> = { responsive: true };

  donsDoughnut: ChartData<'doughnut'> = {
    labels: ['Financier', 'Nature', 'Parrainage', 'Événementiel'],
    datasets: [{ data: [50, 20, 15, 15], backgroundColor: ['#007bff', '#ffc107', '#ff7f50', '#6f42c1'] }]
  };
  donsDoughnutOptions: ChartOptions<'doughnut'> = { responsive: true };

  projetsRadar: ChartData<'radar'> = {
    labels: ['Projet A', 'Projet B', 'Projet C', 'Projet D'],
    datasets: [{ label: 'Dons reçus', data: [120, 80, 150, 100], backgroundColor: 'rgba(0,123,255,0.2)', borderColor: '#007bff' }]
  };
  projetsRadarOptions: ChartOptions<'radar'> = { responsive: true };

  donsPolarArea: ChartData<'polarArea'> = {
    labels: ['Financier', 'Nature', 'Parrainage', 'Événementiel'],
    datasets: [{ data: [120, 90, 60, 30], backgroundColor: ['#007bff', '#28a745', '#ffc107', '#ff7f50'] }]
  };
  donsPolarAreaOptions: ChartOptions<'polarArea'> = { responsive: true };

  projetsRecents = [
    { nom: 'Projet Eau Potable', organisation: 'ONG Solidarité', statut: 'En cours', dons: 1200, urgent: true },
    { nom: 'Projet Éducation', organisation: 'Association Lumière', statut: 'Terminé', dons: 850, urgent: false },
    { nom: 'Projet Santé', organisation: 'Fondation Santé', statut: 'En cours', dons: 600, urgent: true }
  ];

  charts: { title: string; type: any; data: any; options: any }[] = [
    { title: 'Dons mensuels',            type: this.chartDonneesMensuellesDonsType, data: this.donneesMensuellesDons, options: this.optionsDonneesMensuelles },
    { title: 'Répartition par projet',   type: this.chartRepartitionParProjetType,  data: this.repartitionParProjet,   options: this.optionsRepartitionProjet },
    { title: 'Progression des dons',     type: this.chartDonsLineChartType,         data: this.donsLineChartData,      options: this.donsLineChartOptions },
    { title: 'Comparaison projets',      type: this.chartProjetsRadarType,          data: this.projetsRadar,           options: this.projetsRadarOptions },
    { title: 'Répartition Polar Area',   type: this.chartDonsPolarAreaType,         data: this.donsPolarArea,          options: this.donsPolarAreaOptions },
    { title: 'Types de dons',            type: this.chartDonsDoughnutType,          data: this.donsDoughnut,           options: this.donsDoughnutOptions }
  ];

}
