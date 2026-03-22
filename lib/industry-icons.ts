import {
  Building2, Wheat, Mountain, Factory, Zap, Recycle, HardHat,
  ShoppingCart, Truck, UtensilsCrossed, Monitor, Landmark,
  Building, Scale, ClipboardList, Shield,
  GraduationCap, HeartPulse, Palette, Handshake, Users, Globe,
  Tractor, Fish, TreePine, Pickaxe, Gem, Fuel,
  Beef, Wine, Shirt, Scissors, Newspaper, FlaskConical, Pill, Car, Cpu,
  Lightbulb, Droplets, Pipette, Trash2, Leaf,
  Hammer, Route, Wrench,
  Store, Package, ShoppingBag,
  Train, Ship, Plane, Warehouse, Mail,
  Hotel, Coffee,
  BookOpen, Radio, Wifi, Smartphone, Server, Database,
  Banknote, ShieldCheck, CreditCard,
  Home, Briefcase, Microscope, Megaphone, Stethoscope,
  Theater, Gamepad2, Church, Cog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Section-level icons (A-U)
export const SECTION_ICONS: Record<string, LucideIcon> = {
  A: Wheat,
  B: Mountain,
  C: Factory,
  D: Zap,
  E: Recycle,
  F: HardHat,
  G: ShoppingCart,
  H: Truck,
  I: UtensilsCrossed,
  J: Monitor,
  K: Landmark,
  L: Building,
  M: Scale,
  N: ClipboardList,
  O: Shield,
  P: GraduationCap,
  Q: HeartPulse,
  R: Palette,
  S: Handshake,
  T: Users,
  U: Globe,
};

// Division-level icons (2-digit NACE codes)
const DIVISION_ICONS: Record<string, LucideIcon> = {
  // A: Agriculture
  '01': Tractor, '02': TreePine, '03': Fish,
  // B: Mining
  '05': Pickaxe, '06': Fuel, '07': Gem, '08': Mountain, '09': Wrench,
  // C: Manufacturing
  '10': Beef, '11': Wine, '12': Leaf, '13': Shirt, '14': Scissors,
  '15': ShoppingBag, '16': TreePine, '17': Newspaper, '18': Newspaper,
  '19': Fuel, '20': FlaskConical, '21': Pill, '22': Package, '23': Mountain,
  '24': Factory, '25': Hammer, '26': Cpu, '27': Lightbulb, '28': Cog,
  '29': Car, '30': Ship, '31': Home, '32': Wrench, '33': Wrench,
  // D: Electricity
  '35': Zap,
  // E: Water/Waste
  '36': Droplets, '37': Pipette, '38': Trash2, '39': Leaf,
  // F: Construction
  '41': Building, '42': Route, '43': Hammer,
  // G: Trade
  '45': Car, '46': Package, '47': Store,
  // H: Transport
  '49': Train, '50': Ship, '51': Plane, '52': Warehouse, '53': Mail,
  // I: Hospitality
  '55': Hotel, '56': Coffee,
  // J: IT/Communication
  '58': BookOpen, '59': Theater, '60': Radio, '61': Wifi, '62': Smartphone, '63': Database,
  // K: Finance
  '64': Banknote, '65': ShieldCheck, '66': CreditCard,
  // L: Real estate
  '68': Building,
  // M: Professional
  '69': Scale, '70': Briefcase, '71': HardHat, '72': Microscope,
  '73': Megaphone, '74': FlaskConical, '75': Stethoscope,
  // N: Admin services
  '77': CreditCard, '78': Users, '79': Plane, '80': Shield, '81': Building2, '82': ClipboardList,
  // O: Public admin
  '84': Shield,
  // P: Education
  '85': GraduationCap,
  // Q: Health
  '86': HeartPulse, '87': Home, '88': Handshake,
  // R: Arts/Sports
  '90': Palette, '91': Church, '92': Gamepad2, '93': Gamepad2,
  // S: Other services
  '94': Users, '95': Wrench, '96': Scissors,
  // T: Households
  '97': Home, '98': Home,
  // U: Extraterritorial
  '99': Globe,
};

/**
 * Get icon for any NACE code — checks division first, then section, then default.
 */
export function getIndustryIcon(code: string): LucideIcon {
  // Single letter = section
  if (code.length === 1) return SECTION_ICONS[code] ?? Building2;
  // Try division (first 2 digits)
  const div = code.replace('.', '').substring(0, 2);
  if (DIVISION_ICONS[div]) return DIVISION_ICONS[div];
  // Fallback to section icon via parent lookup — not available here, use default
  return Building2;
}
