/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TaskCategory {
  COZINHA = "Cozinha",
  BANHEIRO = "Banheiro",
  SALA = "Sala",
  QUARTO = "Quarto",
  COMPRAS = "Compras",
  PET = "Pet",
  EXTERNO = "Externo",
  OUTRO = "Outro"
}

export enum TaskPriority {
  BAIXA = "Baixa",
  NORMAL = "Normal",
  URGENTE = "Urgente"
}

export enum EventType {
  COMPROMISSO = "Compromisso",
  DATA_ESPECIAL = "Data especial",
  VIAGEM = "Viagem",
  SAIDA_JUNTOS = "Saída juntos",
  SAIDA_PASSEIO = "Saída passeio",
  RESTAURANTE = "Restaurante",
  LEMBRETE = "Lembrete",
  COMPRA = "Compra planejada",
  TAREFA = "Tarefa com prazo",
  INDIVIDUAL = "Evento individual",
  OUTRO = "Outro"
}

export enum ShoppingCategory {
  HORTIFRUTI = "Hortifrúti",
  LATICINIOS = "Laticínios",
  CARNES = "Carnes",
  LIMPEZA = "Limpeza",
  HIGIENE = "Higiene",
  OUTROS = "Outros"
}

export enum ExpenseCategory {
  ALIMENTACAO = "Alimentação",
  MORADIA = "Moradia",
  LAZER = "Lazer",
  SAUDE = "Saúde",
  TRANSPORTE = "Transporte",
  PETS = "Pets",
  OUTROS = "Outros"
}

export enum MoodType {
  CANSADO = "Cansado",
  BEM = "Bem",
  OTIMO = "Ótimo",
  ANSIOSO = "Ansioso",
  BAIXA = "Na baixa"
}

export enum WishlistCategory {
  LAR = "Para o Lar",
  EXPERIENCIA = "Experiências",
  PESSOAL = "Pessoal",
  PETS = "Pets",
  VIAGEM = "Viagem",
  CASA = "Para a Casa",
  ELETRONICOS = "Eletrônicos",
  OUTRO = "Outro"
}

export interface User {
  id: string;
  name: string;
  nickname?: string; // Meu apelido carinhoso próprio
  partner_nickname: string; // nickname Leandro gives Kaisa and vice-versa
  color: string; // custom hex color or tailwind shade for styling
  timezone: string;
  avatar_url?: string;
  points_weekly: number;
  coins: number;
  roulette_items?: string[];
  preferences?: {
    defaultPaymentMethod?: string;
    loveLanguage?: string;
    notificationsEnabled?: boolean;
    customStatus?: string;
  };
}

export interface ShoppingFinalization {
  id: string;
  monthId: string;
  estimatedTotal: number;
  realTotal: number;
  difference: number;
  paymentMethod: string;
  paidBy: string;
  date: string;
}

export interface Couple {
  id: string;
  invite_code: string;
  connected: boolean;
  home_level: number;
  total_points: number;
  coins?: number;
  category_budgets?: Record<string, number>;
  unlocked_achievements: string[]; // e.g. "7-days-no-dishes"
  xp_multiplier_until?: string;
  feed_reactions?: Record<string, Record<string, string>>; // timestamp -> { userId -> emoji }
  shoppingBudgets?: Record<string, number>;
  shoppingFinalizations?: ShoppingFinalization[];
}

export interface TaskComment {
  id: string;
  author_id: string;
  text: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  responsible_id: string; // "Leandro" | "Kaisa" | "Ambos"
  due_date?: string;
  recurrence: "Nenhuma" | "Diária" | "Semanal" | "Quinzenal" | "Mensal";
  category: TaskCategory;
  priority: TaskPriority;
  time_estimate?: number; // minutes
  photo_proof?: string; // base64 payload or representation
  points: number;
  coins?: number;
  completed: boolean;
  completed_at?: string;
  archived: boolean;
  comments: TaskComment[];
  coupleId?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  start_time: string;
  end_time?: string;
  location?: string;
  travel_checklist?: { item: string; checked: boolean }[];
  booking_link?: string;
  responsible_id: string; // "Leandro" | "Kaisa" | "Ambos"
  comments: { id: string; author_id: string; text: string; timestamp: string }[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: ShoppingCategory;
  quantity: number;
  unit: string;
  price?: number;
  is_bought: boolean;
  bought_at?: string;
  added_by: string;
  suggested?: boolean;
  reason_suggested?: string;
  monthId?: string; // e.g. "2026-05" (Maio/2026)
  listStatus?: "active" | "finalized";
  paymentMethod?: string; // VR, Débito, Crédito, PIX, Dinheiro
}

export interface Expense {
  id: string;
  value: number;
  currency: "R$" | "USD" | "EUR";
  description: string;
  paid_by_id: string; // "Leandro" | "Kaisa"
  split_type: "50/50" | "paid_all" | "partner_all" | "custom";
  custom_percent?: number; // % that Leandro pays if custom
  category: ExpenseCategory;
  date: string;
  receipt_url?: string;
  is_recurring: boolean;
  is_paid_this_month?: boolean;
  payment_method?: "Débito" | "Crédito" | "Pix" | "Dinheiro" | "Carteira digital" | "Outro";
  card_name?: string;
  installments_total?: number;
  installments_current?: number;
  monthly_installment_value?: number;
}

export interface Memory {
  id: string;
  url: string;
  description: string;
  date: string;
  location?: string;
  album_name?: string; // e.g. "Nossa primeira viagem", "Nosso apartamento"
  is_capsule?: boolean;
  capsule_unlock_date?: string;
  created_at: string;
}

export interface MoodCheckIn {
  id: string;
  user_id: string; // "Leandro" | "Kaisa"
  mood: MoodType;
  note?: string; // private by default
  share_note: boolean;
  date: string; // YYYY-MM-DD
}

export interface WishlistItem {
  id: string;
  name: string;
  photo_url?: string;
  link?: string;
  estimated_price?: number;
  priority: "Baixa" | "Média" | "Alta";
  is_private_to_partner?: boolean; // surprise item
  category: WishlistCategory;
  currency_type?: "BRL" | "COINS"; // New: tracking real money vs in-app coins 
  saving_goal?: number;
  saving_saved?: number;
  added_by: string;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string;
  duration: number; // minutes
  portions: number;
  couple_rating?: "Gostamos" | "Não repetir" | "Favorita";
  tags: string[]; // e.g. "vegana", "rápida", "econômica"
  photo_url?: string;
}

export interface MealPlan {
  id: string; // day_mealtype (e.g. "Segunda-Café")
  day: "Segunda" | "Terça" | "Quarta" | "Quinta" | "Sexta" | "Sábado" | "Domingo";
  meal_type: "Café" | "Almoço" | "Jantar";
  recipe_id?: string; // foreign key
  custom_text?: string; // custom description if not linking a recipe
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_quantity: number; // threshold to automatically suggest to shopping list
}

export interface HouseStatus {
  status: "order" | "balanced" | "accumulating" | "reorganize";
  headline: string;
  description: string;
}

export interface WeeklySummary {
  tasks_completed: number;
  moments_recorded: number;
  total_spent: number;
  average_mood_leandro: MoodType;
  average_mood_kaisa: MoodType;
  unlocked_achievements: string[];
}

export interface Reward {
  id: string;
  title: string;
  cost: number;
  desc: string;
  emoji: string;
  is_repeatable: boolean;
  linked_task_id?: string;
}

export interface FixedFunction {
  id: string;
  title: string;
  responsible_id: string;
  frequency: string; // e.g. "Diário", "Semanal", "Mensal"
  coupleId?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  points: number;
  coins?: number;
  type: "Faxina" | "Afeto" | "Culinária" | "Saúde" | "Outros" | "Custom";
  target_count?: number; // e.g. 3, for "complete 3 cleanups"
  current_count?: number; // current progress
  combined_target?: number; // cooperative target
  combined_current?: number;
  deadline?: string;
  shared_reward?: string;
  completed: boolean;
}

export interface QuickNote {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
}

export interface PetVaccine {
  id: string;
  name: string;
  date_applied: string;
  next_dose_date?: string;
  is_completed: boolean;
}

export interface PetMedication {
  id: string;
  name: string;
  type: "Antiparasitário" | "Remédio" | "Banho/Tosa" | "Consulta" | "Outro";
  date: string;
  notes?: string;
}

export interface PetWeightRecord {
  id: string;
  weight: number; // kg
  date: string;
}

export interface PetDocument {
  id: string;
  title: string;
  link: string;
  date_created: string;
}

export interface Pet {
  id: string;
  name: string;
  breed?: string;
  age?: number;
  avatar_url?: string;
  coupleId?: string;
  vaccines: PetVaccine[];
  medications: PetMedication[];
  weights: PetWeightRecord[];
  documents: PetDocument[];
  food_daily_qty?: number; // daily weight in g
  food_inventory_item_id?: string; // connects to inventory item
}

// ==========================================
// INTIMACY MODULE (SPICY MODE) TYPES
// ==========================================

// Mercado Negro - Loja Secundária de Intimidade
export interface SpicyReward {
  id: string;
  title: string;
  description: string;
  cost: number; // Higher coin cost for spicy items
  emoji: string;
  is_repeatable: boolean;
  created_by: string; // "Leandro" | "Kaisa" | "system"
  coupleId: string;
  created_at: string;
  is_active: boolean;
}

// Missões Especiais +18 (Quests de Sexta)
export interface SpicyQuest {
  id: string;
  title: string;
  description: string;
  bonus_xp: number;
  bonus_coins: number; // Double coins for spicy quests
  created_by: string;
  coupleId: string;
  created_at: string;
  is_active: boolean;
  is_featured: boolean; // Current week's special quest
}

// Spicy Quest Completion Record
export interface SpicyQuestCompletion {
  id: string;
  quest_id: string;
  user_id: string;
  coupleId: string;
  completed_at: string;
  week_date: string; // e.g. "2026-W22" for tracking weekly completions
  bonus_awarded: boolean;
}

// Dados do Amor (Roleta Apimentada)
export interface LoveDiceAction {
  id: string;
  text: string; // e.g. "Beijar", "Massagem", "Cafuné"
  created_by: string;
  coupleId: string;
  is_active: boolean;
  order: number; // For custom ordering
}

export interface LoveDiceLocation {
  id: string;
  text: string; // e.g. "no pescoço", "nas costas", "na orelha"
  created_by: string;
  coupleId: string;
  is_active: boolean;
  order: number;
}

export interface LoveDiceRoll {
  id: string;
  action_id: string;
  location_id: string;
  rolled_by: string;
  coupleId: string;
  rolled_at: string;
  coin_cost: number; // 0 if free, positive if paid
}

// Cofre de Fantasias (Match de Desejos Duplo-Cego)
export interface SecretFantasy {
  id: string;
  title: string;
  description?: string;
  category: string; // "Romance" | "Aventura" | "Intimidade" | "Outro"
  added_by: string; // System defaults or custom user additions
  is_custom: boolean; // True if user-created
  coupleId?: string; // Only for custom entries
  is_active: boolean;
}

export interface UserFantasySelection {
  id: string;
  fantasy_id: string;
  user_id: string; // "Leandro" | "Kaisa"
  coupleId: string;
  selected_at: string;
  is_matched: boolean; // True when both selected same fantasy
  matched_at?: string;
  is_revealed: boolean; // Becomes true after match animation
}

// Tracker de Intimidade (Calendário de Date Nights)
export interface IntimacyCheckin {
  id: string;
  date: string; // YYYY-MM-DD
  user_id: string;
  coupleId: string;
  type: "date_night" | "special_moment" | "quality_time";
  notes?: string; // Private by default
  mood_rating?: number; // 1-5 scale
  linked_task_completion?: string; // Reference to task ID if applicable
  created_at: string;
}

// Intimacy Insights (Generated by backend)
export interface IntimacyInsight {
  id: string;
  coupleId: string;
  insight_text: string;
  insight_type: "frequency" | "correlation" | "suggestion" | "achievement";
  generated_at: string;
  is_read: boolean;
}

// ==========================================
// ENTERTAINMENT MODULE TYPES
// ==========================================

// Encontro Gacha (Roleplay Romântico)
export interface DateOption {
  id: string;
  title: string;
  description?: string;
  category: "restaurante" | "filme" | "passeio" | "em_casa" | "aventura" | "outro";
  estimated_cost?: number;
  emoji: string;
  created_by: string;
  coupleId: string;
  is_active: boolean;
  times_chosen: number; // Track history
}

export interface DateGachaRoll {
  id: string;
  date_option_id: string;
  rolled_by: string;
  coupleId: string;
  rolled_at: string;
  is_accepted: boolean; // Couple can accept or reroll
  scheduled_date?: string; // When they plan to go
}

// Watchlist do Casal
export interface WatchlistItem {
  id: string;
  title: string;
  type: "filme" | "serie" | "documentario" | "anime" | "outro";
  platform?: string; // Netflix, Prime, Disney+, etc.
  genre?: string;
  suggested_by: string;
  coupleId: string;
  status: "quero_ver" | "assistindo" | "assistido" | "pausado";
  current_episode?: number;
  total_episodes?: number;
  rating?: number; // 1-5 stars
  notes?: string;
  added_at: string;
  finished_at?: string;
  whose_turn: string; // "Leandro" | "Kaisa" - who picks next
  poster_url?: string;
}

// Watch History Entry
export interface WatchHistory {
  id: string;
  watchlist_item_id: string;
  watched_at: string;
  watched_by: string; // Both users or individual
  coupleId: string;
}

// ==========================================
// WISHLIST FINANCIAL INTEGRATION
// ==========================================

export interface WishlistDeposit {
  id: string;
  wishlist_item_id: string;
  user_id: string;
  coupleId: string;
  amount: number; // R$ value
  deposited_at: string;
  coin_bonus_awarded: boolean; // +10 coins per deposit
  notes?: string;
}
