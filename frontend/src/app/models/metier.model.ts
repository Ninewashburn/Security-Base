// src/app/models/metier.model.ts

import { Role } from "../interfaces/role";

export interface Metier {
  num_metier: number;
  nom_metier: string;
  code_region: string;
}

export interface MetierWithRole extends Metier {
  role: Role | null;
}