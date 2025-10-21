import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

export interface ProjetCreateOutput {
  titre: string;
  description?: string;
  dateDebut?: string;   // YYYY-MM-DD
  dateFin?: string;
  lieu?: string;
  imageFile?: File | null;
  urgent?: boolean;
}

@Component({
  selector: 'app-projet-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projet-create.html',
  styleUrls: ['./projet-create.scss']
})
export class ProjetCreate {
  @Input() submitting = false;
  @Output() projetCree = new EventEmitter<ProjetCreateOutput>();
  @Output() cancel = new EventEmitter<void>();

  // Modèle local du formulaire
  titre = '';
  description = '';
  lieu = '';
  dateDebut: string = '';  // si vide -> fallback today lors du submit
  dateFin: string = '';
  urgent = false;
  imageFile: File | null = null;

  mediaPreview: string | null = null;
  errorMessage = '';

  get isImagePreview(): boolean {
    return !!this.mediaPreview && this.mediaPreview.startsWith('data:image');
  }

  private toISODate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  onFileSelected(e: Event) {
    this.errorMessage = '';
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) {
      this.imageFile = null;
      this.mediaPreview = null;
      return;
    }

    // ✅ n’autoriser que des images (backend exige image/*)
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Seules les images sont acceptées (JPEG, PNG, …)';
      this.imageFile = null;
      this.mediaPreview = null;
      input.value = '';
      return;
    }

    // (optionnel) limite de taille 5 Mo
    const MAX = 5 * 1024 * 1024;
    if (file.size > MAX) {
      this.errorMessage = 'Fichier trop volumineux (max 5 Mo).';
      this.imageFile = null;
      this.mediaPreview = null;
      input.value = '';
      return;
    }

    this.imageFile = file;

    const reader = new FileReader();
    reader.onload = () => this.mediaPreview = String(reader.result || '');
    reader.readAsDataURL(file);
  }

  submit(form: NgForm) {
    this.errorMessage = '';
    if (!form.valid || this.submitting) return;

    // ✅ fallback dateDebut si vide (évite parseIso côté backend)
    const d0 = this.dateDebut?.trim();
    const safeDateDebut = d0 && /^\d{4}-\d{2}-\d{2}$/.test(d0)
      ? d0
      : this.toISODate(new Date());

    this.projetCree.emit({
      titre: this.titre.trim(),
      description: this.description?.trim(),
      lieu: this.lieu?.trim(),
      dateDebut: safeDateDebut,
      dateFin: this.dateFin || undefined,
      imageFile: this.imageFile,
      urgent: this.urgent
    });
  }

  reset(form: NgForm) {
    form.resetForm();
    this.mediaPreview = null;
    this.imageFile = null;
    this.errorMessage = '';
  }

  onCancel() {
    if (this.submitting) return;
    this.cancel.emit();
  }
}
