// src/app/pages/validating/validating.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-validating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './validating.html',
  styleUrl: './validating.scss'
})
export class ValidatingComponent implements OnInit {
  currentStep = 1;
  hasError = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.validateSession();
  }

  private validateSession(): void {
    // Étape 1 : Validation du token
    this.currentStep = 1;

    setTimeout(() => {
      // Étape 2 : Récupération des permissions
      this.currentStep = 2;

      setTimeout(() => {
        // Étape 3 : Finalisation
        this.currentStep = 3;

        // Appel à /api/auth/me pour valider la session
        this.authService.validateSession().subscribe({
          next: (response) => {
            if (response.authenticated && response.user) {
              // Vérification du token
              const storedToken = sessionStorage.getItem('jwt_token');

              if (!storedToken) {
                console.error('Erreur critique : Token non stocké après authentification');
                this.showError('Erreur d\'authentification. Token manquant.');
                return;
              }

              // Redirection vers l'application
              setTimeout(() => {
                this.router.navigate(['/incidents']);
              }, 500);
            } else {
              this.showError('Session invalide. Veuillez vous reconnecter.');
            }
          },
          error: (error) => {
            console.error('Erreur lors de la validation de session:', error);
            this.showError('Erreur de connexion. Veuillez réessayer.');
          }
        });
      }, 800);
    }, 800);
  }

  private showError(message: string): void {
    this.hasError = true;
    this.errorMessage = message;

    // Redirection vers la page d'accueil après 3 secondes
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 3000);
  }
}