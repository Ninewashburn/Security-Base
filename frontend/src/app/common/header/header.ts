// src/app/components/header/header.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ThemeService } from '../../services/theme/theme.service';
import { MetierService } from '../../services/metier/metier.service';
import { PermissionService } from '../../services/permissions/permission.service';
import { AuthService } from '../../services/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isDarkMode = false;
  currentTheme = 'light';
  themeIcon = '☀️';
  themeLabel = 'Clair';
  isMobileMenuOpen = false;
  frontUrl = environment.frontUrl;

  constructor(
    public themeService: ThemeService,
    public metierService: MetierService,
    public permissionService: PermissionService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    // S'abonner aux changements de thème
    this.themeService.isDarkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isDark) => {
        this.isDarkMode = isDark;
      });

    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe((theme) => {
        this.currentTheme = theme;
        this.themeIcon = this.themeService.getThemeIcon();
        this.themeLabel = this.themeService.getThemeLabel();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * DÉCONNEXION : Nettoie la session
   */
  logout(): void {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      // Déconnecter proprement (nettoie session + token)
      this.authService.logout();
    }
    // Petit délai avant rechargement pour laisser le serveur nettoyer
    setTimeout(() => {
      window.location.href = environment.frontUrl;
    }, 300);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
  get userDisplayName(): string {
    return this.authService.getUserDisplayName();
  }
}
