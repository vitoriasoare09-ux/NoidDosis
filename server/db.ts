import { MongoClient, Db, Collection } from "mongodb";
import {
  User,
  Couple,
  Task,
  Event,
  ShoppingItem,
  Expense,
  Memory,
  MoodCheckIn,
  WishlistItem,
  Recipe,
  MealPlan,
  InventoryItem,
  TaskCategory,
  TaskPriority,
  EventType,
  ShoppingCategory,
  ExpenseCategory,
  MoodType,
  WishlistCategory,
  Reward,
  Quest,
  QuickNote,
  Pet
} from "../src/types";

interface DatabaseSchema {
  users: { [key: string]: User };
  couple: Couple;
  couples?: { [key: string]: Couple };
  couplesUsers?: { [key: string]: { [userId: string]: User } };
  accounts?: { email: string; passwordHash: string; userId: string; coupleId: string }[];
  tasks: Task[];
  events: Event[];
  shopping: ShoppingItem[];
  expenses: Expense[];
  memories: Memory[];
  moods: MoodCheckIn[];
  wishlist: WishlistItem[];
  recipes: Recipe[];
  mealPlan: MealPlan[];
  inventory: InventoryItem[];
  rewards: Reward[];
  quests: Quest[];
  quickNotes: QuickNote[];
  pets?: Pet[];
  houseDocuments?: any[];
  houseMaintenances?: any[];
  houseContacts?: any[];
  fixedBills?: any[];
  fixedFunctions?: any[];
  quizzes?: any[];
  spicyCheckins?: any[];
  secretWishes?: any[];
  spicyRewards?: any[];
  spicyQuests?: any[];
  spicyQuestCompletions?: any[];
  loveDiceActions?: any[];
  loveDiceLocations?: any[];
  loveDiceRolls?: any[];
  secretFantasies?: any[];
  userFantasySelections?: any[];
  intimacyCheckins?: any[];
  intimacyInsights?: any[];
  dateOptions?: any[];
  dateGachaRolls?: any[];
  watchlistItems?: any[];
  watchHistory?: any[];
  wishlistDeposits?: any[];
}

const DEFAULT_USERS: { [key: string]: User } = {
  Leandro: {
    id: "Leandro",
    name: "Leandro",
    partner_nickname: "Mozão",
    color: "#3B82F6",
    timezone: "America/Sao_Paulo",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    points_weekly: 40,
    coins: 0
  },
  Kaisa: {
    id: "Kaisa",
    name: "Kaisa",
    partner_nickname: "Meu Amor",
    color: "#EC4899",
    timezone: "America/Sao_Paulo",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    points_weekly: 55,
    coins: 0
  }
};

const DEFAULT_COUPLE: Couple = {
  id: "couple_1",
  invite_code: "AMOR42",
  connected: true,
  home_level: 4,
  total_points: 380,
  unlocked_achievements: ["7-days-no-dishes", "first-trip-album"]
};

const DEFAULT_TASKS: Task[] = [
  {
    id: "task_1",
    title: "Lavar a louça do jantar",
    description: "Lavar pratos, panelas e limpar a pia para manter a cozinha cheirosa.",
    responsible_id: "Leandro",
    category: TaskCategory.COZINHA,
    priority: TaskPriority.NORMAL,
    due_date: new Date().toISOString().split("T")[0],
    recurrence: "Diária",
    time_estimate: 20,
    points: 10,
    completed: false,
    archived: false,
    comments: []
  }
];

const DEFAULT_EVENTS: Event[] = [];
const DEFAULT_SHOPPING: ShoppingItem[] = [];
const DEFAULT_EXPENSES: any[] = [];
const DEFAULT_MEMORIES: Memory[] = [];
const DEFAULT_MOODS: MoodCheckIn[] = [];
const DEFAULT_WISHLIST: WishlistItem[] = [];
const DEFAULT_RECIPES: Recipe[] = [];
const DEFAULT_MEAL_PLAN: MealPlan[] = [];
const DEFAULT_INVENTORY: InventoryItem[] = [];
const DEFAULT_REWARDS: Reward[] = [];
const DEFAULT_QUESTS: Quest[] = [];
const DEFAULT_PETS: Pet[] = [];
const DEFAULT_HOUSE_DOCUMENTS: any[] = [];
const DEFAULT_HOUSE_MAINTENANCES: any[] = [];
const DEFAULT_HOUSE_CONTACTS: any[] = [];
const DEFAULT_FIXED_BILLS: any[] = [];
const DEFAULT_SPICY_REWARDS: any[] = [];
const DEFAULT_SPICY_QUESTS: any[] = [];
const DEFAULT_LOVE_DICE_ACTIONS: any[] = [];
const DEFAULT_LOVE_DICE_LOCATIONS: any[] = [];
const DEFAULT_SECRET_FANTASIES: any[] = [];
const DEFAULT_DATE_OPTIONS: any[] = [];
const DEFAULT_WATCHLIST: any[] = [];

function buildDefaultState(): DatabaseSchema {
  return {
    users: { ...DEFAULT_USERS },
    couple: { ...DEFAULT_COUPLE },
    couples: { "couple_1": { ...DEFAULT_COUPLE } },
    couplesUsers: { "couple_1": { ...DEFAULT_USERS } },
    accounts: [
      { email: "leandro@nosdois.com", passwordHash: "123456", userId: "Leandro", coupleId: "couple_1" },
      { email: "kaisa@nosdois.com", passwordHash: "123456", userId: "Kaisa", coupleId: "couple_1" }
    ],
    tasks: [...DEFAULT_TASKS],
    events: [...DEFAULT_EVENTS],
    shopping: [...DEFAULT_SHOPPING],
    expenses: [...DEFAULT_EXPENSES],
    memories: [...DEFAULT_MEMORIES],
    moods: [...DEFAULT_MOODS],
    wishlist: [...DEFAULT_WISHLIST],
    recipes: [...DEFAULT_RECIPES],
    mealPlan: [...DEFAULT_MEAL_PLAN],
    inventory: [...DEFAULT_INVENTORY],
    rewards: [...DEFAULT_REWARDS],
    quests: [...DEFAULT_QUESTS],
    quickNotes: [],
    pets: [...DEFAULT_PETS],
    houseDocuments: [...DEFAULT_HOUSE_DOCUMENTS],
    houseMaintenances: [...DEFAULT_HOUSE_MAINTENANCES],
    houseContacts: [...DEFAULT_HOUSE_CONTACTS],
    fixedBills: [...DEFAULT_FIXED_BILLS],
    spicyRewards: [...DEFAULT_SPICY_REWARDS],
    spicyQuests: [...DEFAULT_SPICY_QUESTS],
    spicyQuestCompletions: [],
    loveDiceActions: [...DEFAULT_LOVE_DICE_ACTIONS],
    loveDiceLocations: [...DEFAULT_LOVE_DICE_LOCATIONS],
    loveDiceRolls: [],
    secretFantasies: [...DEFAULT_SECRET_FANTASIES],
    userFantasySelections: [],
    intimacyCheckins: [],
    intimacyInsights: [],
    dateOptions: [...DEFAULT_DATE_OPTIONS],
    dateGachaRolls: [],
    watchlistItems: [...DEFAULT_WATCHLIST],
    watchHistory: [],
    wishlistDeposits: []
  };
}

const STORE_KEY = "nosdois_main";

export class DBStore {
  private data!: DatabaseSchema;
  private collection!: Collection;
  private ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI environment variable is not set");

    const client = new MongoClient(uri);
    await client.connect();
    const mongoDb: Db = client.db("nosdois");
    this.collection = mongoDb.collection("store");

    const existing = await this.collection.findOne({ _key: STORE_KEY });
    if (existing) {
      const { _id, _key, ...rest } = existing as any;
      this.data = rest as DatabaseSchema;
      this.applyMigrations();
    } else {
      this.data = buildDefaultState();
      await this.collection.insertOne({ _key: STORE_KEY, ...this.data });
    }
  }

  private applyMigrations() {
    if (!this.data.rewards) this.data.rewards = [];
    if (!this.data.quests) this.data.quests = [];
    if (!this.data.quickNotes) this.data.quickNotes = [];
    if (!this.data.couples) this.data.couples = { "couple_1": { ...this.data.couple } };
    if (!this.data.accounts) this.data.accounts = [
      { email: "leandro@nosdois.com", passwordHash: "123456", userId: "Leandro", coupleId: "couple_1" },
      { email: "kaisa@nosdois.com", passwordHash: "123456", userId: "Kaisa", coupleId: "couple_1" }
    ];
    if (!this.data.couplesUsers) this.data.couplesUsers = { "couple_1": { ...this.data.users } };
    if (!this.data.pets) this.data.pets = [];
    if (!this.data.houseDocuments) this.data.houseDocuments = [];
    if (!this.data.houseMaintenances) this.data.houseMaintenances = [];
    if (!this.data.houseContacts) this.data.houseContacts = [];
    if (!this.data.fixedBills) this.data.fixedBills = [];
    if (!this.data.spicyRewards) this.data.spicyRewards = [];
    if (!this.data.spicyQuests) this.data.spicyQuests = [];
    if (!this.data.spicyQuestCompletions) this.data.spicyQuestCompletions = [];
    if (!this.data.loveDiceActions) this.data.loveDiceActions = [];
    if (!this.data.loveDiceLocations) this.data.loveDiceLocations = [];
    if (!this.data.loveDiceRolls) this.data.loveDiceRolls = [];
    if (!this.data.secretFantasies) this.data.secretFantasies = [];
    if (!this.data.userFantasySelections) this.data.userFantasySelections = [];
    if (!this.data.intimacyCheckins) this.data.intimacyCheckins = [];
    if (!this.data.intimacyInsights) this.data.intimacyInsights = [];
    if (!this.data.dateOptions) this.data.dateOptions = [];
    if (!this.data.dateGachaRolls) this.data.dateGachaRolls = [];
    if (!this.data.watchlistItems) this.data.watchlistItems = [];
    if (!this.data.watchHistory) this.data.watchHistory = [];
    if (!this.data.wishlistDeposits) this.data.wishlistDeposits = [];
  }

  public async waitReady() {
    await this.ready;
  }

  public getStore(): DatabaseSchema {
    return this.data;
  }

  public saveStore() {
    const { ...dataToSave } = this.data;
    this.collection
      .updateOne({ _key: STORE_KEY }, { $set: dataToSave }, { upsert: true })
      .catch(err => console.error("Error saving to MongoDB:", err));
  }

  public resetToDefaults() {
    this.data = buildDefaultState();
    this.saveStore();
  }
}

export const db = new DBStore();
