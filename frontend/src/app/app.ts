// src/app/app.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet, ActivatedRoute, Router } from '@angular/router';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Header } from "./common/header/header";
import { Footer } from './common/footer/footer';
import { NotificationComponent } from './common/notification/notification';
import { AuthService } from './services/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, Header, Footer, NotificationComponent, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  isCheckingSession = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    // Vérifier si on revient du SSO avec un token dans l'URL
    this.route.queryParams.subscribe(params => {
      const token = params['token'];

      if (token) {
        // Stocker le token
        this.authService.setToken(token);

        // Nettoyer l'URL
        this.router.navigate([], {
          queryParams: { token: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });

    // Valider la session utilisateur
    this.authService.validateSession().subscribe({
      next: () => {
        this.isCheckingSession = false;
      },
      error: () => {
        this.isCheckingSession = false;
      }
    });
  }
}