// src/app/services/quill-config/quill-config.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface QuillToolbarConfig {
  toolbar: any[];
}

export interface QuillStyles {
  height: string;
  border: string;
  borderRadius: string;
  backgroundColor?: string;
  fontFamily?: string;
}

export type QuillConfigType = 'full' | 'compact' | 'basic' | 'email';

@Injectable({
  providedIn: 'root'
})
export class QuillConfigService {

  // ===== CONFIGURATIONS OPTIMISÉES =====

  private readonly configs: Record<QuillConfigType, QuillToolbarConfig> = {
    full: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['clean'],
        ['link']
      ]
    },
    compact: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
        ['clean']
      ]
    },
    basic: {
      toolbar: [
        ['bold', 'italic', 'strike'],
        [{ 'list': 'bullet' }, { 'list': 'check' }],
        ['clean']
      ]
    },
    email: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'header': 2 }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link'],
        ['clean']
      ]
    }
  };

  private readonly styles: Record<QuillConfigType, QuillStyles> = {
    full: { height: '200px', border: '1px solid #d1d5db', borderRadius: '8px' },
    compact: { height: '150px', border: '1px solid #d1d5db', borderRadius: '8px' },
    basic: { height: '120px', border: '1px solid #d1d5db', borderRadius: '8px' },
    email: {
      height: '180px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontFamily: 'monospace'
    }
  };

  // ===== API SIMPLIFIÉE =====

  getConfig(type: QuillConfigType): QuillToolbarConfig {
    return this.configs[type] || this.configs.full;
  }

  getStyles(type: QuillConfigType): QuillStyles {
    return this.styles[type] || this.styles.full;
  }

  // ===== GETTERS SIMPLIFIÉS =====
  get fullConfig() { return this.getConfig('full'); }
  get compactConfig() { return this.getConfig('compact'); }
  get basicConfig() { return this.getConfig('basic'); }
  get emailConfig() { return this.getConfig('email'); }

  get descriptionStyles() { return this.getStyles('full'); }
  get compactStyles() { return this.getStyles('compact'); }
  get basicStyles() { return this.getStyles('basic'); }
  get emailStyles() { return this.getStyles('email'); }

  // ===== UTILITAIRES OPTIMISÉS =====

  isQuillContentEmpty(content: string): boolean {
    return !content?.replace(/<[^>]*>/g, '').trim();
  }

  getPlainTextFromQuill(content: string): string {
    return content?.replace(/<[^>]*>/g, '').trim() || '';
  }

  getWordCount(htmlContent: string): number {
    if (!htmlContent) {
      return 0;
    }
    // Créer un élément DOM temporaire pour extraire le texte brut
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const text = tempDiv.textContent || tempDiv.innerText || '';

    // Compter les mots sur le texte brut
    if (!text.trim()) {
      return 0;
    } const words = text.trim().split(/\s+/);
    return words.length;
  }

  private readonly suggestions = {
    'actions-menees': [
      'Redémarrage du serveur principal',
      'Vérification des logs système',
      'Contact équipe support niveau 2',
      'Mise en place solution de contournement',
      'Escalade vers l\'équipe infrastructure',
      'Test de la solution temporaire'
    ],
    'actions-a-mener': [
      'Analyse approfondie des causes racines',
      'Mise à jour de la documentation',
      'Formation équipe sur nouvelle procédure',
      'Test de non-régression',
      'Planification maintenance préventive',
      'Révision des alertes monitoring'
    ]
  };

  getFieldSuggestions(fieldType: 'actions-menees' | 'actions-a-mener'): string[] {
    return this.suggestions[fieldType] || [];
  }

  getDefaultEmailTemplate(): string {
    const frontUrl = environment.frontUrl; // ou this.environment.frontUrl selon votre injection
    return `<p>Un incident concernant <strong>{object}</strong> vient d'être ajouté à la base des incidents.</p>
  <p>Vous pouvez aller le consulter en cliquant ici : <a href="${frontUrl}/incident/{id}" target="_blank" rel="noopener noreferrer"><strong><u>Consulter l'incident</u></strong></a></p>`;
  }

  processEmailTemplate(template: string, variables: { object: string; id: number | string }): string {
    return template
      .replace(/{object}/g, variables.object)
      .replace(/{id}/g, variables.id.toString());
  }
}