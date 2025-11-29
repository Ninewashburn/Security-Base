// src/app/common/services/notification.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Notification } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      duration: notification.duration || 5000
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, newNotification]);

    // Auto-suppression après la durée spécifiée
    if (newNotification.duration ? newNotification.duration > 0 : false) {
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, newNotification.duration);
    }
  }

  success(title: string, message?: string, duration?: number): void {
    this.addNotification({ type: 'success', title, message, duration });
  }

  error(title: string, message?: string, duration?: number): void {
    this.addNotification({ type: 'error', title, message, duration: duration || 8000 });
  }

  warning(title: string, message?: string, duration?: number): void {
    this.addNotification({ type: 'warning', title, message, duration });
  }

  info(title: string, message?: string, duration?: number): void {
    this.addNotification({ type: 'info', title, message, duration });
  }

  removeNotification(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(filteredNotifications);
  }

  clearAll(): void {
    this.notificationsSubject.next([]);
  }
}
