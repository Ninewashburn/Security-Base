// src/app/services/theme/theme.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private readonly STORAGE_KEY = 'security-base-theme';
  
  // État réactif du thème
  private themeSubject = new BehaviorSubject<Theme>('light');
  public theme$ = this.themeSubject.asObservable();
  
  // État calculé (auto = système)
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
  public isDarkMode$ = this.isDarkModeSubject.asObservable();

  constructor() {
    this.initializeTheme();
    this.setupSystemThemeListener();
  }

  /**
   * Initialise le thème depuis localStorage ou système
   */
  private initializeTheme(): void {
    const savedTheme = localStorage.getItem(this.STORAGE_KEY) as Theme;
    const theme = savedTheme || 'auto';
    this.setTheme(theme);
  }

  /**
   * Écoute les changements de thème système
   */
  private setupSystemThemeListener(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      mediaQuery.addEventListener('change', () => {
        if (this.currentTheme === 'auto') {
          this.updateDarkMode();
        }
      });
    }
  }

  /**
   * Définit le thème
   */
  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.updateDarkMode();
    this.applyThemeToDocument();
  }

  /**
   * Met à jour l'état dark mode selon le thème et le système
   */
  private updateDarkMode(): void {
    const theme = this.currentTheme;
    let isDark = false;

    switch (theme) {
      case 'dark':
        isDark = true;
        break;
      case 'light':
        isDark = false;
        break;
      case 'auto':
        isDark = this.getSystemPreference();
        break;
    }

    this.isDarkModeSubject.next(isDark);
  }

  /**
   * Récupère la préférence système
   */
  private getSystemPreference(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }

  /**
   * Applique le thème au document
   */
  private applyThemeToDocument(): void {
    if (typeof document !== 'undefined') {
      const isDark = this.isDarkModeSubject.value;
      
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  

  /**
   * Bascule entre les thèmes (cycle: light → dark → auto)
   */
  toggleTheme(): void {
    const current = this.currentTheme;
    
    switch (current) {
      case 'light':
        this.setTheme('dark');
        break;
      case 'dark':
        this.setTheme('auto');
        break;
      case 'auto':
        this.setTheme('light');
        break;
    }
  }

  /**
   * Bascule simplement light/dark (sans auto)
   */
  toggleSimple(): void {
    const isDark = this.isDarkModeSubject.value;
    this.setTheme(isDark ? 'light' : 'dark');
  }

  // ===== GETTERS =====

  get currentTheme(): Theme {
    return this.themeSubject.value;
  }

  get isDarkMode(): boolean {
    return this.isDarkModeSubject.value;
  }

  /**
   * Retourne l'icône pour le bouton de thème
   */
  getThemeIcon(): string {
    const theme = this.currentTheme;
    switch (theme) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'auto': return '🔄';
      default: return '☀️';
    }
  }

  /**
   * Retourne le label du thème actuel
   */
  getThemeLabel(): string {
    const theme = this.currentTheme;
    switch (theme) {
      case 'light': return 'Clair';
      case 'dark': return 'Sombre';
      case 'auto': return 'Auto';
      default: return 'Clair';
    }
  }
}