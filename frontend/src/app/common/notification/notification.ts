// src/app/common/notification/notification.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification/notification.service';
import { Notification } from '../../models';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-notification',
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.scss'
})
export class NotificationComponent implements OnInit, OnDestroy {

  notifications: Notification[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private notificationService: NotificationService, private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.subscription = this.notificationService.notifications$.subscribe(
      notifications => this.notifications = notifications
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  removeNotification(id: string): void {
    this.notificationService.removeNotification(id);
  }

  getNotificationClasses(type: string): string {
    const baseClasses = 'border-l-4';

    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-50 border-green-400 dark:bg-green-900 dark:border-green-500`;
      case 'error':
        return `${baseClasses} bg-red-50 border-red-400 dark:bg-red-900 dark:border-red-500`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 border-yellow-400 dark:bg-yellow-900 dark:border-yellow-500`;
      case 'info':
        return `${baseClasses} bg-blue-50 border-blue-400 dark:bg-blue-900 dark:border-blue-500`;
      default:
        return `${baseClasses} bg-gray-50 border-gray-400 dark:bg-gray-800 dark:border-gray-600`;
    }
  }

  getTitleClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
      default:
        return 'text-gray-800 dark:text-gray-200';
    }
  }

  getMessageClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-300';
      case 'error':
        return 'text-red-700 dark:text-red-300';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'info':
        return 'text-blue-700 dark:text-blue-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  }

  getNotificationIcon(type: string): SafeHtml {
    let svgString: string;
    switch (type) {
      case 'success':
        svgString = '<svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>';
        break;
      case 'error':
        svgString = '<svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>';
        break;
      case 'warning':
        svgString = '<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
        break;
      case 'info':
        svgString = '<svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>';
        break;
      default:
        svgString = '<svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>';
        break;
    }
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }
}
