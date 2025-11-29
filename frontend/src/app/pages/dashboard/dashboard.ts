// src/app/pages/dashboard/dashboard.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Role } from '../../interfaces/role';
import { MetierService } from '../../services/metier/metier.service';
import { PermissionService } from '../../services/permissions/permission.service';
import { RoleModal } from '../modals/role-modal/role-modal';
import { MetierRoleModal } from '../modals/metier-role/metier-role';
import { AuthService } from '../../services/auth/auth.service';
import { MetierWithRole } from '../../models/metier.model';
import { Workbook } from 'exceljs';
import { ALL_PERMISSIONS, PERMISSION_CATEGORIES } from '../../data/permission-data';
import { UserService } from '../../services/user/user.service';
import { User } from '../../models/user.model';
import { NotificationService } from '../../services/notification/notification.service';

type TabId = 'droits' | 'metiers' | 'utilisateurs';

interface Tab {
  id: TabId;
  label: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RoleModal, MetierRoleModal],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  activeTab: TabId = 'droits';

  tabs: Tab[] = [
    { id: 'droits', label: 'Droits' },
    { id: 'metiers', label: 'Métiers' },
    { id: 'utilisateurs', label: 'Utilisateurs' }
  ];

  // Recherche et filtres
  searchTerm = '';
  metierFilter: string = 'all';
  userRoleFilter: string = 'all';

  // État de chargement
  isLoadingMetiers = false;
  metiersError: string | null = null;
  isLoadingUsers = false;
  usersError: string | null = null;

  // Modal state
  selectedRole: Role | null = null;
  showRoleModal = false;
  showMetierRoleModal = false;

  refreshMetiersTab: boolean = true;

  // Données des rôles (chargées depuis l'API)
  roles: Role[] = [];
  displayRoles: Role[] = []; // Rôles dans l'ordre d'affichage souhaité

  // Données des métiers (depuis l'API)
  metiers: MetierWithRole[] = [];

  // Données des utilisateurs
  users: User[] = [];

  // Données filtrées
  filteredRoles: Role[] = [];
  filteredMetiers: MetierWithRole[] = [];
  filteredUsers: User[] = [];

  // Données paginées pour l'affichage
  paginatedMetiers: MetierWithRole[] = [];
  paginatedUsers: User[] = [];

  // État de la pagination pour chaque onglet
  metiersPagination = {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
  };

  usersPagination = {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
  };

  constructor(
    private router: Router,
    private metierService: MetierService,
    private permissionService: PermissionService,
    private authService: AuthService,
    private userService: UserService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.loadRoles();
    this.loadMetiers();
    this.loadUsers();
    this.filterData();
  }

  /**
   * Charger les rôles depuis l'API via PermissionService
   */
  loadRoles(): void {
    this.permissionService.roles$.subscribe({
      next: (roles) => {
        this.roles = roles;

        // Trier les rôles par ordre alphabétique du label
        const sortedRoles = [...roles].sort((a, b) => a.label.localeCompare(b.label));

        // Trouver le rôle 'consultant'
        const consultantRole = sortedRoles.find(role => role.code === 'consultant');
        const otherRoles = sortedRoles.filter(role => role.code !== 'consultant');

        // Construire displayRoles: autres rôles, puis consultant
        this.displayRoles = [...otherRoles];
        if (consultantRole) {
          this.displayRoles.push(consultantRole);
        }

        this.filterData();
      },
      error: (error) => {
        console.error('❌ Erreur chargement rôles:', error);
      }
    });
  }

  /**
   * Charger les métiers depuis l'API
   */
  loadMetiers(forceRefresh = false): void {
    this.isLoadingMetiers = true;
    this.metiersError = null;

    this.metierService.getMetiers(forceRefresh).subscribe({
      next: (metiers) => {
        if (!Array.isArray(metiers)) {
          console.error('❌ Format de données invalide:', metiers);
          this.metiersError = 'Format de données invalide';
          this.isLoadingMetiers = false;
          return;
        }

        this.metiers = metiers;
        this.isLoadingMetiers = false;
        this.filterData();
      },
      error: (error) => {
        console.error('❌ Erreur chargement métiers:', error);
        this.metiersError = 'Impossible de charger les métiers. Vérifiez la connexion à l\'API.';
        this.isLoadingMetiers = false;
      }
    });
  }

  /**
   * Charger les utilisateurs depuis l'API
   */
  loadUsers(): void {
    this.isLoadingUsers = true;
    this.usersError = null;

    this.userService.getAllUsersFromApi().subscribe({
      next: (response) => {
        if (response && Array.isArray(response)) {
          this.users = response;
        } else if (Array.isArray(response)) {
          this.users = response;
        } else {
          console.error('❌ Format de données utilisateurs invalide:', response);
          this.usersError = 'Format de données invalide';
          this.users = [];
        }
        this.isLoadingUsers = false;
        this.filterData();

      },
      error: (err) => {
        this.usersError = 'Impossible de charger les utilisateurs.';
        this.isLoadingUsers = false;
        console.error('❌ Erreur chargement utilisateurs:', err);
      }
    });
  }

  /**
   * Filtrer les données selon le terme de recherche
   */
  filterData(): void {
    const term = this.searchTerm.toLowerCase();

    this.filteredRoles = this.roles.filter(role =>
      role.label.toLowerCase().includes(term) ||
      role.description.toLowerCase().includes(term)
    );

    let metiersToFilter = this.metiers;
    if (this.metierFilter !== 'all') {
      if (this.metierFilter === 'none') {
        metiersToFilter = this.metiers.filter(m => !m.role);
      } else {
        metiersToFilter = this.metiers.filter(m => m.role?.code === this.metierFilter);
      }
    }
    this.filteredMetiers = metiersToFilter.filter(metier =>
      metier.nom_metier.toLowerCase().includes(term) ||
      (metier.role && metier.role.label.toLowerCase().includes(term))
    );

    // Filtrage des utilisateurs par rôle ET recherche
    let usersToFilter = this.users;
    if (this.userRoleFilter !== 'all') {
      if (this.userRoleFilter === 'none') {
        usersToFilter = this.users.filter(u => !u.role_code);
      } else {
        usersToFilter = this.users.filter(u => u.role_code === this.userRoleFilter);
      }
    }
    this.filteredUsers = usersToFilter.filter(user =>
      user.full_name.toLowerCase().includes(term) ||
      user.login.toLowerCase().includes(term) ||
      (user.metier && user.metier.nom_metier.toLowerCase().includes(term)) ||
      (user.role_label && user.role_label.toLowerCase().includes(term))
    );

    // Mettre à jour la pagination pour chaque onglet
    this.updateMetiersPagination();
    this.updateUsersPagination();
  }

  // =============================================
  // GESTION DE LA PAGINATION
  // =============================================

  // --- Pagination pour les Métiers ---
  updateMetiersPagination(): void {
    this.metiersPagination.totalItems = this.filteredMetiers.length;
    this.metiersPagination.totalPages = Math.ceil(this.metiersPagination.totalItems / this.metiersPagination.pageSize);

    // S'assurer que la page courante n'est pas hors limites
    if (this.metiersPagination.currentPage > this.metiersPagination.totalPages) {
      this.metiersPagination.currentPage = this.metiersPagination.totalPages || 1;
    }

    const startIndex = (this.metiersPagination.currentPage - 1) * this.metiersPagination.pageSize;
    this.paginatedMetiers = this.filteredMetiers.slice(startIndex, startIndex + this.metiersPagination.pageSize);
  }

  goToMetierPage(page: number): void {
    if (page >= 1 && page <= this.metiersPagination.totalPages) {
      this.metiersPagination.currentPage = page;
      this.updateMetiersPagination();
    }
  }

  changeMetierPageSize(event: Event): void {
    const newSize = +(event.target as HTMLSelectElement).value;
    this.metiersPagination.pageSize = newSize;
    this.metiersPagination.currentPage = 1; // Revenir à la première page
    this.updateMetiersPagination();
  }

  // --- Pagination pour les Utilisateurs ---
  updateUsersPagination(): void {
    this.usersPagination.totalItems = this.filteredUsers.length;
    this.usersPagination.totalPages = Math.ceil(this.usersPagination.totalItems / this.usersPagination.pageSize);

    // S'assurer que la page courante n'est pas hors limites
    if (this.usersPagination.currentPage > this.usersPagination.totalPages) {
      this.usersPagination.currentPage = this.usersPagination.totalPages || 1;
    }

    const startIndex = (this.usersPagination.currentPage - 1) * this.usersPagination.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, startIndex + this.usersPagination.pageSize);
  }

  goToUserPage(page: number): void {
    if (page >= 1 && page <= this.usersPagination.totalPages) {
      this.usersPagination.currentPage = page;
      this.updateUsersPagination();
    }
  }

  changeUserPageSize(event: Event): void {
    const newSize = +(event.target as HTMLSelectElement).value;
    this.usersPagination.pageSize = newSize;
    this.usersPagination.currentPage = 1; // Revenir à la première page
    this.updateUsersPagination();
  }

  // --- Méthodes pour l'affichage des pages (avec ellipses) ---
  getVisibleMetierPages(): number[] {
    return this.calculateVisiblePages(this.metiersPagination.currentPage, this.metiersPagination.totalPages);
  }

  getVisibleUserPages(): number[] {
    return this.calculateVisiblePages(this.usersPagination.currentPage, this.usersPagination.totalPages);
  }

  private calculateVisiblePages(currentPage: number, totalPages: number): number[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, -1, totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, -1, currentPage - 1, currentPage, currentPage + 1, -1, totalPages];
  }

  // --- Informations de pagination ---
  getMetiersPaginationInfo(): string {
    const state = this.metiersPagination;
    if (state.totalItems === 0) return 'Aucun élément';

    const startIndex = (state.currentPage - 1) * state.pageSize + 1;
    const endIndex = Math.min(state.currentPage * state.pageSize, state.totalItems);

    return `Affichage de ${startIndex}-${endIndex} sur ${state.totalItems} élément(s)`;
  }

  getUsersPaginationInfo(): string {
    const state = this.usersPagination;
    if (state.totalItems === 0) return 'Aucun élément';

    const startIndex = (state.currentPage - 1) * state.pageSize + 1;
    const endIndex = Math.min(state.currentPage * state.pageSize, state.totalItems);

    return `Affichage de ${startIndex}-${endIndex} sur ${state.totalItems} élément(s)`;
  }

  /**
   * Vérifie si l'utilisateur a accès à la gestion des métiers et rôles
   */
  canAccessMetierRoles(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return false;
    }
    return user.role_code === 'admin';
  }

  public countMetiersByRole(roleCode: string): number {
    if (!this.metiers) {
      return 0;
    }
    if (roleCode === 'none') {
      return this.metiers.filter(metier => !metier.role).length;
    }
    return this.metiers.filter(metier => metier.role?.code === roleCode).length;
  }

  // Compter les utilisateurs par rôle
  public countUsersByRole(roleCode: string): number {
    if (!this.users) {
      return 0;
    }
    if (roleCode === 'none') {
      return this.users.filter(user => !user.role_code).length;
    }
    return this.users.filter(user => user.role_code === roleCode).length;
  }

  /**
   * Compte le nombre de métiers avec un rôle assigné
   */
  get metiersWithRoleCount(): number {
    return this.metiers.filter(m => m.role && m.role.code !== 'consultant').length;
  }

  /**
   * Compter les utilisateurs sans rôle
   */
  get usersWithoutRoleCount(): number {
    return this.users.filter(u => !u.role_code).length;
  }

  /**
   * Calculer le nombre de permissions actives pour un rôle
   */
  getActivePermissionsCount(role: Role): number {
    return Object.values(role.permissions).filter(p => p === true).length;
  }

  /**
   * Calculer le nombre total de permissions
   */
  getTotalPermissionsCount(): number {
    // Si aucun rôle n'est chargé, ou si le premier rôle n'a pas de permissions, on retourne 0.
    if (!this.roles || this.roles.length === 0 || !this.roles[0].permissions) {
      return 0;
    }

    // On prend le premier rôle de la liste comme référence pour compter les permissions.
    return Object.keys(this.roles[0].permissions).length;
  }

  /**
   * Calculer le pourcentage de permissions actives
   */
  getPermissionPercentage(role: Role): number {
    const active = this.getActivePermissionsCount(role);
    const total = this.getTotalPermissionsCount();
    return Math.round((active / total) * 100);
  }

  /**
   * Obtenir la couleur de la barre de progression
   */
  getProgressBarColor(percentage: number): string {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  }

  /**
   * Obtenir la couleur du pourcentage
   */
  getPercentageColor(percentage: number): string {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-orange-600';
    return 'text-red-600';
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

  /**
   * Ouvrir la modal d'édition d'un rôle
   */
  openRoleModal(role: Role): void {
    this.selectedRole = { ...role, permissions: { ...role.permissions } };
    this.showRoleModal = true;
  }

  /**
   * Ouvrir la modal d'association métier-rôle
   */
  openMetierRoleModal() {
    this.showMetierRoleModal = true;
  }

  /**
   * Fermer la modal
   */
  closeRoleModal(): void {
    this.showRoleModal = false;
    this.selectedRole = null;
  }

  /**
   * Fermer la modal d'association métier-rôle
   */
  closeMetierRoleModal() {
    this.showMetierRoleModal = false;
  }

  /**
   * Recharger aussi les utilisateurs après modification des métiers-rôles
   * Cette méthode est appelée quand la modal d'association métier-rôle est sauvegardée.
   * Il faut recharger les utilisateurs car leurs rôles sont calculés depuis metier_roles.
   */
  onMetierRoleModalSaved() {
    this.showMetierRoleModal = false;

    // 1. Recharger les métiers pour voir les nouvelles associations
    this.loadMetiers(true);

    // 2. Recharger les utilisateurs car leurs rôles dépendent de metier_roles
    this.loadUsers();

    // 3. Force re-render de l'onglet métiers
    this.refreshMetiersTab = false;
    setTimeout(() => {
      this.refreshMetiersTab = true;
    }, 0);
  }

  /**
   * Sauvegarder les modifications d'un rôle
   */
  saveRole(updatedRole: Role): void {

    if (!this.permissionService) {
      console.error('❌ PermissionService non injecté !');
      alert('Erreur : Service de permissions non disponible');
      return;
    }

    this.permissionService.updateRole(updatedRole.id, updatedRole).subscribe({
      next: (savedRole) => {
        this.notificationService.success('Rôle mis à jour', `Les permissions du rôle ${savedRole.label} ont été mises à jour.`);
        // Rafraîchir la session utilisateur
        this.authService.validateSession().subscribe({
          error: (err: any) => console.error('❌ Erreur rafraîchissement session:', err)
        });

        this.closeRoleModal();
      },
      error: (error) => {
        console.error('❌ Erreur sauvegarde rôle:', error);
        console.error('📋 Détails erreur:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.notificationService.error('Erreur de sauvegarde', `Impossible de sauvegarder le rôle : ${error.error?.message || error.message}`);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/incidents']);
  }

  canExportRights(): boolean {
    return this.permissionService.canExportData();
  }

  async exportToExcel(): Promise<void> {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Matrice Permissions');

    // =============================================
    // 1. CONFIGURATION DES STYLES
    // =============================================

    // Style pour l'en-tête principal (bleu foncé)
    const headerStyle = {
      font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FF1F4E78' }
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      }
    };

    // Style pour les catégories (bleu clair)
    const categoryStyle = {
      font: { bold: true, size: 11, color: { argb: 'FF1F4E78' } },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFB4C7E7' }
      },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      }
    };

    // Style pour les permissions actives (vert)
    const activeStyle = {
      font: { bold: true, size: 14, color: { argb: 'FF006100' } },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFC6EFCE' }
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      }
    };

    // Style pour les permissions inactives (rouge)
    const inactiveStyle = {
      font: { bold: true, size: 14, color: { argb: 'FF9C0006' } },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFFFC7CE' }
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      }
    };

    // Style pour les lignes de données (fond blanc)
    const dataStyle = {
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFFFFFFF' }
      },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      },
      alignment: { vertical: 'middle' as const, wrapText: true }
    };

    // Style pour la ligne de total (jaune)
    const totalStyle = {
      font: { bold: true, size: 10 },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFFFF2CC' }
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      }
    };

    // =============================================
    // 2. CONFIGURATION DES COLONNES
    // =============================================

    worksheet.columns = [
      { key: 'code', width: 28 },
      { key: 'permission', width: 32 },
      { key: 'description', width: 55 },
      { key: 'admin', width: 16 },
      { key: 'responsable', width: 16 },
      { key: 'technicien', width: 16 },
      { key: 'animateur', width: 16 },
      { key: 'consultant', width: 16 }
    ];

    // =============================================
    // 3. LIGNE D'EN-TÊTE
    // =============================================

    const headerRow = worksheet.addRow([
      'Code action unitaire',
      'Permission',
      'Description',
      'Administrateur',
      'Responsable',
      'Technicien',
      'Animateur',
      'Consultant'
    ]);

    // Appliquer le style d'en-tête
    headerRow.height = 25;
    headerRow.eachCell(cell => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
      cell.border = headerStyle.border;
    });

    // =============================================
    // 4. ORDRE CORRECT DES RÔLES (FIX DU BUG)
    // =============================================

    // Définir l'ordre EXACT des rôles tel qu'ils apparaissent dans les colonnes Excel
    const orderedRoleCodes = ['admin', 'responsable', 'technicien', 'animateur', 'consultant'];

    // Créer un tableau de rôles dans le bon ordre
    const rolesInExcelOrder = orderedRoleCodes.map(code =>
      this.roles.find(role => role.code === code)
    ).filter(role => role !== undefined) as Role[];

    // =============================================
    // 5. GROUPER LES PERMISSIONS PAR CATÉGORIE
    // =============================================

    const permissionsByCategory = PERMISSION_CATEGORIES.reduce((acc, category) => {
      acc[category.name] = category.permissions.map(p => p.key);
      return acc;
    }, {} as Record<string, (keyof Role['permissions'])[]>);

    let permissionCounter = 1;

    // =============================================
    // 6. AJOUTER LES PERMISSIONS PAR CATÉGORIE
    // =============================================

    Object.entries(permissionsByCategory).forEach(([categoryName, permissionKeys], categoryIndex) => {
      // Ajouter une ligne vide avant chaque catégorie sauf la première
      if (categoryIndex > 0) {
        worksheet.addRow([]);
      }

      // Ligne de catégorie
      const categoryRow = worksheet.addRow([`📌 ${categoryName}`]);
      categoryRow.height = 22;

      // Fusionner les cellules de la catégorie (colonnes A à H)
      worksheet.mergeCells(`A${categoryRow.number}:H${categoryRow.number}`);

      // Appliquer le style de catégorie
      for (let col = 1; col <= 8; col++) {
        const cell = categoryRow.getCell(col);
        cell.font = categoryStyle.font;
        cell.fill = categoryStyle.fill;
        cell.alignment = categoryStyle.alignment;
        cell.border = categoryStyle.border;
      }

      // Ajouter les permissions de cette catégorie
      permissionKeys.forEach(permKey => {
        const permission = ALL_PERMISSIONS.find(p => p.key === permKey);
        if (!permission) return;

        const code = `SB_${String(permissionCounter).padStart(3, '0')}_${permKey}`;
        const permissionRow = worksheet.addRow([
          code,
          permission.label,
          permission.description
        ]);

        permissionRow.height = 25;

        // Appliquer le style de données aux 3 premières colonnes
        permissionRow.getCell(1).font = { size: 9, color: { argb: 'FF1F4E78' } };
        permissionRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        permissionRow.getCell(1).fill = dataStyle.fill;
        permissionRow.getCell(1).border = dataStyle.border;

        permissionRow.getCell(2).font = { size: 10, bold: true };
        permissionRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        permissionRow.getCell(2).fill = dataStyle.fill;
        permissionRow.getCell(2).border = dataStyle.border;

        permissionRow.getCell(3).font = { size: 9 };
        permissionRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        permissionRow.getCell(3).fill = dataStyle.fill;
        permissionRow.getCell(3).border = dataStyle.border;

        // Ajouter les valeurs pour chaque rôle DANS LE BON ORDRE
        rolesInExcelOrder.forEach((role, index) => {
          const key = permKey as keyof typeof role.permissions;
          const hasPermission = Boolean(role.permissions[key]);

          const cell = permissionRow.getCell(4 + index);
          cell.value = hasPermission ? '✓' : '✗';

          if (hasPermission) {
            cell.font = activeStyle.font;
            cell.fill = activeStyle.fill;
          } else {
            cell.font = inactiveStyle.font;
            cell.fill = inactiveStyle.fill;
          }

          cell.alignment = activeStyle.alignment;
          cell.border = activeStyle.border;
        });

        permissionCounter++;
      });
    });

    // =============================================
    // 7. LIGNE VIDE AVANT TOTAL
    // =============================================
    worksheet.addRow([]);

    // =============================================
    // 8. LIGNE DE TOTAL (BON ORDRE DES RÔLES)
    // =============================================

    const totalRow = worksheet.addRow([]);
    const totalPermissions = ALL_PERMISSIONS.length;
    const totalRowData: (string | null)[] = ['TOTAL', `${totalPermissions} permissions`, ''];

    // Calculer les totaux
    rolesInExcelOrder.forEach(role => {
      const activePermissions = ALL_PERMISSIONS.filter(p => role.permissions[p.key]).length;
      const percentage = totalPermissions > 0 ? Math.round((activePermissions / totalPermissions) * 100) : 0;
      totalRowData.push(`${activePermissions}/${totalPermissions} (${percentage}%)`);
    });

    totalRow.values = totalRowData;
    totalRow.height = 25;

    // Appliquer le style de total
    totalRow.eachCell((cell) => {
      cell.font = totalStyle.font;
      cell.fill = totalStyle.fill;
      cell.border = totalStyle.border;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // =============================================
    // 9. GÉNÉRER LE FICHIER
    // =============================================

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Matrice_Permissions_SecurityBase_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);

    // Notification de succès
    this.notificationService.success('✓ Export Excel réussi', 'success');
  }
}