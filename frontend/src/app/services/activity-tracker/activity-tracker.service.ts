// src/app/services/activity-tracker/activity-tracker.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ActivityTrackerService {
  private lastActivity = Date.now();
  private readonly INACTIVITY_THRESHOLD = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.initActivityListeners();
  }

  /**
   * Initialise les listeners d'activité utilisateur
   */
  private initActivityListeners(): void {
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(
        event,
        () => this.updateActivity(),
        { passive: true }
      );
    });
  }

  /**
   * Met à jour le timestamp de dernière activité
   */
  private updateActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Vérifie si l'utilisateur est actif
   * @returns true si l'utilisateur a été actif dans les 10 dernières minutes
   */
  isUserActive(): boolean {
    return Date.now() - this.lastActivity < this.INACTIVITY_THRESHOLD;
  }

  /**
   * Obtient le temps écoulé depuis la dernière activité
   * @returns Nombre de secondes depuis la dernière activité
   */
  getInactivityDuration(): number {
    return Math.floor((Date.now() - this.lastActivity) / 1000);
  }

  /**
   * Obtient le timestamp de la dernière activité
   * @returns Timestamp en millisecondes
   */
  getLastActivityTimestamp(): number {
    return this.lastActivity;
  }
}