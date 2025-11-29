// metier-role-modal.ts
import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MetierRoleService } from '../../../services/metier-role/metier-role.service';
import { AuthService } from '../../../services/auth/auth.service';
import { NotificationService } from '../../../services/notification/notification.service';

interface Role {
  id: number;
  code: string;
  label: string;
}

interface Metier {
  num_metier: number;
  nom_metier: string;
  code_region: string;
  role?: Role | null; // Renommé de current_role à role et peut être null
}

@Component({
  selector: 'app-metier-role-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './metier-role.html',
  styleUrls: ['./metier-role.scss']
})
export class MetierRoleModal implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  roles: Role[] = [];
  metiers: Metier[] = [];
  filteredMetiersList: Metier[] = [];

  selectedRole: string = '';
  selectedMetiers = new Set<number>();
  searchTerm = '';

  loading = false;
  saving = false;

  currentUserMetierNum: number | null = null;
  protectedMetiers: number[] = []; // Métiers protégés

  constructor(
    private metierRoleService: MetierRoleService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.loadData();

    // Récupérer le métier de l'utilisateur actuel
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.metier?.num_metier) {
      this.currentUserMetierNum = currentUser.metier.num_metier;
    }

    // Définir les métiers protégés
    this.protectedMetiers = [321]; // CDD DEV
  }

  loadData() {
    this.loading = true;

    this.metierRoleService.getMetiersWithRoles().subscribe({
      next: (response: any) => {
        let metiers = response.data.metiers;
        this.roles = response.data.roles;

        // Logique pour épingler le métier de l'utilisateur en haut
        const userMetier = metiers.find((m: Metier) => m.num_metier === this.currentUserMetierNum);
        let otherMetiers = metiers.filter((m: Metier) => m.num_metier !== this.currentUserMetierNum);

        otherMetiers.sort((a: Metier, b: Metier) => a.nom_metier.localeCompare(b.nom_metier));

        this.metiers = userMetier ? [userMetier, ...otherMetiers] : otherMetiers;
        this.filteredMetiersList = [...this.metiers];

        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement', error);
        this.loading = false;
      }
    });
  }

  filterMetiers() {
    const term = this.searchTerm.toLowerCase();

    this.filteredMetiersList = this.metiers.filter(m =>
      m.nom_metier.toLowerCase().includes(term) ||
      m.code_region.toLowerCase().includes(term)
    );
  }

  toggleMetier(numMetier: number) {
    // Empêcher la modification de son propre métier
    if (numMetier === this.currentUserMetierNum) {
      alert('⚠️ Vous ne pouvez pas modifier votre propre rôle !');
      return;
    }

    // Avertissement pour les métiers protégés
    if (this.protectedMetiers.includes(numMetier)) {
      const metier = this.metiers.find(m => m.num_metier === numMetier);
      if (!confirm(`⚠️ ATTENTION : Vous allez modifier le rôle d'un administrateur système :\n\n${metier?.nom_metier}\n\nÊtes-vous sûr ?`)) {
        return;
      }
    }

    if (this.selectedMetiers.has(numMetier)) {
      this.selectedMetiers.delete(numMetier);
    } else {
      this.selectedMetiers.add(numMetier);
    }
  }

  selectAll() {
    this.filteredMetiersList.forEach(metier => {
      if (metier.num_metier !== this.currentUserMetierNum) {
        this.selectedMetiers.add(metier.num_metier);
      }
    });
  }

  deselectAll() {
    this.selectedMetiers.clear();
  }

  getRoleColor(roleCode: string): string {
    const colors: Record<string, string> = {
      'admin': 'red-600',
      'responsable': 'orange-600',
      'technicien': 'blue-600',
      'consultant': 'gray-600',
      'animateur': 'green-600'
    };
    return colors[roleCode] || 'gray-600';
  }

  /**
   * Obtenir les classes CSS pour le badge de rôle
   */
  getRoleBadgeClass(roleCode: string): string {
    const colorMap: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      responsable: 'bg-orange-100 text-orange-800',
      technicien: 'bg-blue-100 text-blue-800',
      animateur: 'bg-green-100 text-green-800',
      consultant: 'bg-gray-100 text-gray-700'
    };
    return colorMap[roleCode] || 'bg-gray-100 text-gray-700';
  }

  save() {
    if (!this.selectedRole || this.selectedMetiers.size === 0) {
      this.notificationService.warning('Sélection incomplète', 'Veuillez sélectionner un rôle et au moins un métier.');
      return;
    }

    this.saving = true;
    const metierNums = Array.from(this.selectedMetiers);

    // Convertir selectedRole en number ou null
    const roleIdToSend = this.selectedRole === 'null' ? null : +this.selectedRole;

    this.metierRoleService.associateRoles(roleIdToSend, metierNums).subscribe({
      next: () => {
        this.notificationService.success('Association réussie', 'Le rôle a été associé au(x) métier(s) sélectionné(s).');
        this.saved.emit();
        this.closeModal();
      },
      error: (error: any) => {
        console.error('Erreur lors de l\'association', error);
        this.notificationService.error('Erreur d\'association', `Impossible d\'associer le rôle. Détails: ${error.message || error}`);
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  closeModal() {
    this.close.emit();
  }
}