import {
  Building2, Wheat, Mountain, Factory, Zap, Droplets, HardHat,
  ShoppingCart, Truck, UtensilsCrossed, Monitor, Landmark,
  Building, Scale, ClipboardList, Shield,
  GraduationCap, HeartPulse, Palette, Handshake, Users, Globe,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const SECTION_ICONS: Record<string, LucideIcon> = {
  A: Wheat,           // Lauksaimniecība
  B: Mountain,        // Ieguves rūpniecība
  C: Factory,         // Apstrādes rūpniecība
  D: Zap,             // Elektroenerģija
  E: Droplets,        // Ūdens apgāde
  F: HardHat,         // Būvniecība
  G: ShoppingCart,    // Tirdzniecība
  H: Truck,           // Transports
  I: UtensilsCrossed, // Izmitināšana un ēdināšana
  J: Monitor,         // IT un komunikācijas
  K: Landmark,        // Finanšu darbības
  L: Building,        // Nekustamais īpašums
  M: Scale,           // Profesionālie, zinātniskie pakalpojumi
  N: ClipboardList,   // Administratīvie dienesti
  O: Shield,          // Valsts pārvalde un aizsardzība
  P: GraduationCap,   // Izglītība
  Q: HeartPulse,      // Veselība
  R: Palette,         // Māksla, sports
  S: Handshake,       // Citi pakalpojumi
  T: Users,           // Mājsaimniecības
  U: Globe,           // Ārpusteritoriālās organizācijas
};

export function getSectionIcon(code: string): LucideIcon {
  // For non-section codes, extract the section from breadcrumb or return default
  if (code.length === 1) return SECTION_ICONS[code] ?? Building2;
  return Building2;
}
