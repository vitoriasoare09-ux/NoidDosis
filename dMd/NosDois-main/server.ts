import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db";
import { GoogleGenAI } from "@google/genai";
import {
  Task,
  TaskCategory,
  TaskPriority,
  EventType,
  ShoppingCategory,
  ExpenseCategory,
  MoodType,
  WishlistCategory,
  ShoppingItem,
  Expense,
  Memory,
  WishlistItem,
  Recipe,
  Event,
  Reward,
  Quest,
  Pet,
  SpicyReward,
  SpicyQuest,
  LoveDiceAction,
  LoveDiceLocation,
  SecretFantasy,
  DateOption,
  WatchlistItem
} from "./src/types";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Parsers
app.use(express.json({ limit: "20mb" }));

// Custom simple CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Helper to extract coupleId and userId from the request
function getRequestCredentials(req: express.Request) {
  const coupleId = req.headers["x-couple-id"] || req.query.coupleId || req.body.coupleId;
  const userId = req.headers["x-user-id"] || req.query.userId || req.body.userId;
  return {
    coupleId: typeof coupleId === "string" ? coupleId : "couple_1",
    userId: typeof userId === "string" ? userId : "Leandro"
  };
}

// Middleware to automatically capture coupleId on pushed items
app.use((req, res, next) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();

  const listsToScope = [
    "tasks", "events", "shopping", "expenses", "memories", "moods",
    "wishlist", "recipes", "mealPlan", "inventory", "rewards", "quests", "quickNotes", "pets",
    "houseDocuments", "houseMaintenances", "houseContacts", "fixedBills", "fixedFunctions", "quizzes",
    // Intimacy Module
    "spicyRewards", "spicyQuests", "spicyQuestCompletions",
    "loveDiceActions", "loveDiceLocations", "loveDiceRolls",
    "secretFantasies", "userFantasySelections",
    "intimacyCheckins", "intimacyInsights",
    // Entertainment Module
    "dateOptions", "dateGachaRolls",
    "watchlistItems", "watchHistory",
    "wishlistDeposits"
  ];

  listsToScope.forEach(key => {
    const list = (store as any)[key];
    if (list && Array.isArray(list)) {
      // Overwrite push to intercept and inject coupleId
      (list as any).push = function(...items: any[]) {
        items.forEach(item => {
          if (item && typeof item === "object") {
            item.coupleId = coupleId;
          }
        });
        return Array.prototype.push.apply(this, items);
      };
    }
  });

  next();
});

// Lazy client for Google Gen AI
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      } catch (err) {
        console.error("Failed to initialize GoogleGenAI:", err);
      }
    }
  }
  return aiClient;
}

// ==========================================
// API REST ENDPOINTS
// ==========================================

// ==========================================
// HELPERS FOR MULTI-TENANCY & AUTHENTICATION
// ==========================================

function getCoupleAndUsers(store: any, coupleId: string) {
  if (!store.couples) {
    store.couples = {};
  }
  if (!store.couples[coupleId]) {
    store.couples[coupleId] = {
      id: coupleId,
      invite_code: null,
      connected: true,
      home_level: 1,
      total_points: 0,
      coins: 0,
      unlocked_achievements: []
    };
  }
  if (store.couples[coupleId].coins === undefined) {
    store.couples[coupleId].coins = store.couples[coupleId].total_points || 0;
  }
  if (!store.couplesUsers) {
    store.couplesUsers = {};
  }
  if (!store.couplesUsers[coupleId]) {
    store.couplesUsers[coupleId] = {
      Leandro: {
        id: "Leandro",
        name: "Parceiro 1",
        partner_nickname: "Amor",
        color: "#3B82F6",
        timezone: "America/Sao_Paulo",
        avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
        points_weekly: 0
      },
      Kaisa: {
        id: "Kaisa",
        name: "Parceiro 2",
        partner_nickname: "Vida",
        color: "#EC4899",
        timezone: "America/Sao_Paulo",
        avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
        points_weekly: 0
      }
    };
  }
  return {
    couple: store.couples[coupleId],
    users: store.couplesUsers[coupleId]
  };
}

function unlockSecretAchievement(store: any, coupleId: string, userId: string, key: string, title: string, bonusCoins: number) {
  const { couple, users } = getCoupleAndUsers(store, coupleId);
  if (!couple.unlocked_achievements) {
    couple.unlocked_achievements = [];
  }
  // Check if already unlocked
  if (couple.unlocked_achievements.includes(`achievement:${key}`)) {
    return;
  }
  couple.unlocked_achievements.push(`achievement:${key}`);
  
  if (users[userId]) {
    users[userId].coins = (users[userId].coins || 0) + bonusCoins;
  } else {
    // Fallback if user not found, though should not happen realistically
    if (couple.coins === undefined) {
      couple.coins = couple.total_points || 0;
    }
    couple.coins += bonusCoins;
  }
  
  logActivityForCouple(store, coupleId, "achievement_unlocked", `🏆 Conquista Secreta: '${title}' por ${userId}! (+${bonusCoins} Moedas! 🪙)`);
}

function logActivityForCouple(store: any, coupleId: string, prefix: string, message: string) {
  const { couple } = getCoupleAndUsers(store, coupleId);
  if (!couple.unlocked_achievements) {
    couple.unlocked_achievements = [];
  }
  const timestamp = new Date().toISOString();
  couple.unlocked_achievements.push(`activity:${prefix}:${message}:${timestamp}`);
  
  const nonActivities = couple.unlocked_achievements.filter((a: string) => !a.startsWith("activity:"));
  const activities = couple.unlocked_achievements.filter((a: string) => a.startsWith("activity:"));
  couple.unlocked_achievements = [...nonActivities, ...activities.slice(-40)];
}

function generateInviteCode(): string {
  const prefixes = ["AMOR", "CASAL", "LOVE", "PAR", "LAR", "VIDA"];
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomNumber = Math.floor(10 + Math.random() * 90); // 10 to 99
  return `${randomPrefix}${randomNumber}`;
}

// 1. Get database state scoped for current coupleId
app.get("/api/state", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();
  const { couple, users } = getCoupleAndUsers(store, coupleId);

  // Filter items owned by this coupleId
  const filterByCouple = (items: any[]) => {
    if (!items) return [];
    return items.filter(item => (item.coupleId || "couple_1") === coupleId);
  };

  res.json({
    users,
    couple,
    tasks: filterByCouple(store.tasks),
    events: filterByCouple(store.events),
    shopping: filterByCouple(store.shopping),
    expenses: filterByCouple(store.expenses),
    memories: filterByCouple(store.memories).map(m => {
      if (m.is_capsule && m.capsule_unlock_date) {
        const isLocked = new Date(m.capsule_unlock_date).getTime() > Date.now();
        if (isLocked) {
          return {
            ...m,
            isLocked: true,
            url: "", // Clear actual URL
            description: m.description, // Keep description hidden or clear? Let's hide the description or make it custom
            masked_description: `🔒 Cápsula do Tempo Selada até ${new Date(m.capsule_unlock_date).toLocaleDateString("pt-BR")}`
          };
        }
      }
      return m;
    }),
    moods: filterByCouple(store.moods),
    wishlist: filterByCouple(store.wishlist),
    recipes: filterByCouple(store.recipes),
    mealPlan: filterByCouple(store.mealPlan),
    inventory: filterByCouple(store.inventory),
    rewards: filterByCouple(store.rewards),
    quests: filterByCouple(store.quests),
    quickNotes: filterByCouple(store.quickNotes),
    pets: filterByCouple(store.pets || []),
    houseDocuments: filterByCouple(store.houseDocuments || []),
    houseMaintenances: filterByCouple(store.houseMaintenances || []),
    houseContacts: filterByCouple(store.houseContacts || []),
    fixedBills: filterByCouple(store.fixedBills || []),
    fixedFunctions: filterByCouple(store.fixedFunctions || [])
  });
});

// Real Authentic Coupling flow

// SignUp / Registration for User 1
app.post("/api/auth/register", (req, res) => {
  const { email, password, name, nickname, partner_nickname, color, avatar_url } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "E-mail, senha e nome são obrigatórios" });
  }

  const store = db.getStore();
  if (!store.accounts) store.accounts = [];

  const existingAccount = store.accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
  if (existingAccount) {
    return res.status(400).json({ error: "Este email de conta já está registrado" });
  }

  const generatedCoupleId = "couple_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  const generatedInviteCode = generateInviteCode();

  // Create account
  store.accounts.push({
    email,
    passwordHash: password, // Simple plain text for mock project
    userId: "Leandro", // User 1 maps to Leandro internally
    coupleId: generatedCoupleId
  });

  // Create Couple space
  if (!store.couples) store.couples = {};
  store.couples[generatedCoupleId] = {
    id: generatedCoupleId,
    invite_code: generatedInviteCode,
    connected: false, // Waiting for spouse code integration
    home_level: 1,
    total_points: 0,
    unlocked_achievements: []
  };

  // Initialize Users profile
  if (!store.couplesUsers) store.couplesUsers = {};
  store.couplesUsers[generatedCoupleId] = {
    Leandro: {
      id: "Leandro",
      name: name,
      partner_nickname: partner_nickname || "Meu Amor",
      color: color || "#3B82F6",
      timezone: "America/Sao_Paulo",
      avatar_url: avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
      points_weekly: 0,
      coins: 0
    },
    Kaisa: {
      id: "Kaisa",
      name: "Parceiro 2",
      partner_nickname: "Minha Vida",
      color: "#EC4899",
      timezone: "America/Sao_Paulo",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
      points_weekly: 0,
      coins: 0
    }
  };

  logActivityForCouple(store, generatedCoupleId, "register", `🏠 Lar digital iniciado por ${name}!`);

  db.saveStore();

  res.json({
    success: true,
    email,
    userId: "Leandro",
    coupleId: generatedCoupleId,
    couple: store.couples[generatedCoupleId],
    user: store.couplesUsers[generatedCoupleId]["Leandro"]
  });
});

// Login for existing users
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
  }

  const store = db.getStore();
  if (!store.accounts) store.accounts = [];

  const account = store.accounts.find(a => a.email.toLowerCase() === email.toLowerCase() && a.passwordHash === password);
  if (!account) {
    return res.status(401).json({ error: "E-mail ou senha incorretos" });
  }

  const { couple, users } = getCoupleAndUsers(store, account.coupleId);

  res.json({
    success: true,
    email,
    userId: account.userId,
    coupleId: account.coupleId,
    couple,
    user: users[account.userId],
    users
  });
});

// Verify Couple code (for User 2 login route)
app.post("/api/auth/use-code", (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) {
    return res.status(400).json({ error: "Código é obrigatório" });
  }

  const store = db.getStore();
  if (!store.couples) store.couples = {};

  const cleanCode = inviteCode.trim().toUpperCase();
  const coupleId = Object.keys(store.couples).find(cid => store.couples![cid].invite_code === cleanCode);

  if (!coupleId) {
    return res.status(404).json({ error: "Código do casal inválido ou já conectado!" });
  }

  const couple = store.couples[coupleId];
  if (couple.connected) {
    return res.status(400).json({ error: "Código já foi utilizado e o casal já se deparou!" });
  }

  const { users } = getCoupleAndUsers(store, coupleId);

  res.json({
    success: true,
    coupleId,
    couple,
    firstPartnerName: users["Leandro"]?.name || "Parceiro"
  });
});

// Complete register for spouse (User 2)
app.post("/api/auth/complete-partner", (req, res) => {
  const { coupleId, email, password, name, nickname, avatar_url } = req.body;
  if (!coupleId || !email || !password || !name) {
    return res.status(400).json({ error: "Todos os campos de cadastro são obrigatórios" });
  }

  const store = db.getStore();
  if (!store.accounts) store.accounts = [];

  const existingAccount = store.accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
  if (existingAccount) {
    return res.status(400).json({ error: "Este email de conta já está registrado" });
  }

  const { couple, users } = getCoupleAndUsers(store, coupleId);

  if (couple.connected) {
    return res.status(400).json({ error: "Casal já conectado para este código!" });
  }

  // Register account for Partner 2
  store.accounts.push({
    email,
    passwordHash: password,
    userId: "Kaisa", // User 2 maps to Kaisa internally
    coupleId
  });

  // Upgrade spouse profile info
  users["Kaisa"] = {
    id: "Kaisa",
    name: name,
    partner_nickname: nickname || "Amor",
    color: "#EC4899",
    timezone: "America/Sao_Paulo",
    avatar_url: avatar_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    points_weekly: 0
  };

  // Mark connected, clear connection code
  couple.connected = true;
  couple.invite_code = null;

  logActivityForCouple(store, coupleId, "couple_connected", `💜 ${name} entrou no lar compartilhado com ${users["Leandro"].name}!`);

  db.saveStore();

  res.json({
    success: true,
    email,
    userId: "Kaisa",
    coupleId,
    couple,
    user: users["Kaisa"],
    users
  });
});

// Delete account and all associated couple data
app.post("/api/auth/delete-account", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  if (!coupleId || coupleId === "couple_1") {
    return res.status(400).json({ error: "Para fins de demonstração, não é permitido excluir o lar padrão de simulação." });
  }

  const store = db.getStore();

  // Delete accounts from authorization store
  if (store.accounts) {
    store.accounts = store.accounts.filter(a => a.coupleId !== coupleId);
  }

  // Delete couple metadata
  if (store.couples) {
    delete store.couples[coupleId];
  }

  // Delete users entries
  if (store.couplesUsers) {
    delete store.couplesUsers[coupleId];
  }

  // Filter out scoped items belonging to this couple
  const listsToScope = [
    "tasks", "events", "shopping", "expenses", "memories", "moods",
    "wishlist", "recipes", "mealPlan", "inventory", "rewards", "quests", "quickNotes", "pets",
    "houseDocuments", "houseMaintenances", "houseContacts", "fixedBills", "fixedFunctions", "quizzes"
  ];

  listsToScope.forEach(key => {
    const list = (store as any)[key];
    if (list && Array.isArray(list)) {
      (store as any)[key] = list.filter((item: any) => item.coupleId !== coupleId);
    }
  });

  db.saveStore();

  res.json({
    success: true,
    message: "Todas as contas e histórico do casal foram excluídos com sucesso. Até breve!"
  });
});

// Reset store to original seed data (scoped to Demo space)
app.post("/api/profile/reset", (req, res) => {
  db.resetToDefaults();
  res.json({ success: true, message: "Banco de dados reiniciado com sucesso!", state: db.getStore() });
});

// Update Partner, Name, Nickname, Settings and Preferences (scoped)
app.post("/api/profile/update", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { user_id, name, nickname, partner_nickname, color, timezone, avatar_url, preferences } = req.body;
  const store = db.getStore();
  const { users } = getCoupleAndUsers(store, coupleId);
  
  if (users[user_id]) {
    if (name) {
      users[user_id].name = name;
    }
    if (nickname !== undefined) {
      users[user_id].nickname = nickname;
    }
    if (partner_nickname !== undefined) {
      users[user_id].partner_nickname = partner_nickname;
    }
    if (color) {
      users[user_id].color = color;
    }
    if (timezone) {
      users[user_id].timezone = timezone;
    }
    if (avatar_url) {
      users[user_id].avatar_url = avatar_url;
    }
    if (preferences !== undefined) {
      users[user_id].preferences = {
        ...users[user_id].preferences,
        ...preferences
      };
    }
    db.saveStore();
    res.json({ success: true, user: users[user_id] });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// Couple connection status: disconnect or link demo
app.post("/api/couple/disconnect", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();
  const { couple } = getCoupleAndUsers(store, coupleId);
  couple.connected = false;
  db.saveStore();
  res.json({ success: true, couple });
});

app.post("/api/couple/reconnect", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();
  const { couple } = getCoupleAndUsers(store, coupleId);
  couple.connected = true;
  db.saveStore();
  res.json({ success: true, couple });
});

// Helper for keeping a synchronized real-time activity feed inside unlocked_achievements
function logActivity(store: any, prefix: string, message: string) {
  logActivityForCouple(store, "couple_1", prefix, message);
}

// Spend coins to redeem a reward coupon
app.post("/api/couple/redeem-reward", (req, res) => {
  const { reward_id, user_id, coupleId } = req.body;
  const store = db.getStore();
  
  if (!store.rewards) store.rewards = [];
  const reward = store.rewards.find((r: Reward) => r.id === reward_id);
  if (!reward) {
    return res.status(404).json({ error: "Recompensa não encontrada" });
  }

  const { couple, users } = getCoupleAndUsers(store, coupleId || "couple_1");
  const user = users[user_id];
  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  const currentCoins = user.coins || 0;
  if (currentCoins < reward.cost) {
    return res.status(400).json({ error: `Moedas insuficientes. Você tem ${currentCoins} moedas e precisa de ${reward.cost} 🪙` });
  }

  // Linked Task Paradox Logic
  if (reward.linked_task_id) {
    const task = store.tasks.find((t: Task) => t.id === reward.linked_task_id);
    if (!task) {
      return res.status(400).json({ error: "Tarefa vinculada não existe mais." });
    }
    const partnerId = user_id === "Leandro" ? "Kaisa" : "Leandro";
    if (task.responsible_id === partnerId) {
      return res.status(400).json({ error: "Você não tem o passe livre dessa tarefa pois ela já está com seu parceiro(a)." });
    }
    // Swap ownership
    task.responsible_id = partnerId;
    logActivity(store, "task_transferred", `🔄 ${user_id} comprou um passe livre e transferiu '${task.title}' para ${partnerId}!`);
  }

  // Deduct coins
  user.coins -= reward.cost;

  // Handle one-time vs repeatable
  if (reward.is_repeatable === false) {
    store.rewards = store.rewards.filter((r: Reward) => r.id !== reward_id);
    
    // Cleanup roulette items for all users in the couple
    Object.values(users).forEach((u: any) => {
      if (u.roulette_items && u.roulette_items.includes(reward_id)) {
        u.roulette_items = u.roulette_items.filter((rId: string) => rId !== reward_id);
      }
    });
  }

  if (!couple.unlocked_achievements) {
    couple.unlocked_achievements = [];
  }
  
  const timestampStr = new Date().toISOString();
  couple.unlocked_achievements.push(`redeemed:${reward.title}:${user_id}:${timestampStr}`);
  
  db.saveStore();
  res.json({ success: true, message: `Recompensa '${reward.title}' resgatada com sucesso por ${user_id}!`, coins: user.coins, users, couple });
});

// ================= TAREFAS MODULE =================

// Create Fixed Function
app.post("/api/fixed-functions/create", (req, res) => {
  const { title, responsible_id, frequency, coupleId } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  
  const store = db.getStore();
  if (!store.fixedFunctions) store.fixedFunctions = [];
  
  const newFunction = {
    id: "func_" + Date.now(),
    title: title.slice(0, 100),
    responsible_id: responsible_id || "Ambos",
    frequency: frequency || "Diário",
    coupleId: coupleId || "couple_1"
  };

  store.fixedFunctions.push(newFunction);
  db.saveStore();
  res.json({ success: true, function: newFunction });
});

app.post("/api/fixed-functions/delete", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  if (store.fixedFunctions) {
    store.fixedFunctions = store.fixedFunctions.filter((f: any) => f.id !== id);
  }
  db.saveStore();
  res.json({ success: true });
});

// Create Task
app.post("/api/tasks/create", (req, res) => {
  const { title, description, responsible_id, due_date, recurrence, category, priority, time_estimate, coins } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  
  const store = db.getStore();
  if (!store.tasks) store.tasks = [];
  const newTask: Task = {
    id: "task_" + Date.now(),
    title: title.slice(0, 80),
    description: description ? description.slice(0, 500) : "",
    responsible_id: responsible_id || "Ambos",
    due_date: due_date || undefined,
    recurrence: recurrence || "Nenhuma",
    category: category || TaskCategory.OUTRO,
    priority: priority || TaskPriority.NORMAL,
    time_estimate: time_estimate ? parseInt(time_estimate, 10) : undefined,
    points: priority === TaskPriority.URGENTE ? 25 : 10,
    coins: coins ? parseInt(coins, 10) : undefined,
    completed: false,
    archived: false,
    comments: []
  };

  store.tasks.push(newTask);
  db.saveStore();
  res.json({ success: true, task: newTask });
});

// Toggle Task Complete & Perform Gamification calculation
app.post("/api/tasks/toggle", (req, res) => {
  const { id, user_id, photo_proof } = req.body; // user_id is the person completing it
  const store = db.getStore();
  const task = store.tasks.find(t => t.id === id);
  
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  const wasCompleted = task.completed;
  task.completed = !task.completed;
  
  const coupleId = task.coupleId || "couple_1";
  const { couple, users } = getCoupleAndUsers(store, coupleId);
  
  if (couple.coins === undefined) {
    couple.coins = couple.total_points || 0;
  }
  
  let earnedCombo = false;
  if (task.completed) {
    task.completed_at = new Date().toISOString();
    if (photo_proof) {
      task.photo_proof = photo_proof;
    }
    
    // Gamification Points
    let earnedPoints = task.priority === TaskPriority.URGENTE ? 25 : 10;
    let bonus_earned = 0;
    
    // Check if on-time deadline bonus (due_date exists and completed before or on that date)
    if (task.due_date) {
      const todayStr = new Date().toISOString().split("T")[0];
      if (todayStr <= task.due_date) {
        earnedPoints += 5; // +5 on-time completion bonus!
        bonus_earned += 2; // Extra coins for being on-time
      } else {
        // Late penalty: 3 coins discount
        if (users[user_id]) {
           users[user_id].coins = Math.max(0, (users[user_id].coins || 0) - 3);
           logActivity(store, "task_late_penalty", `💸 Desconto de -3 Moedas para ${user_id} por completar '${task.title}' com atraso.`);
        }
      }
    }

    const hasMultiplier = couple.xp_multiplier_until && new Date(couple.xp_multiplier_until) > new Date();
    if (hasMultiplier) {
      earnedPoints = Math.round(earnedPoints * 1.1);
      bonus_earned = Math.round(bonus_earned * 1.1);
    }
    
    // --- SECRET ACHIEVEMENTS TRIGGERS (Count bonuses first) ---
    
    // 1. Madrugador: completed before 8 AM BRT (UTCHours < 11)
    const targetHour = (new Date().getUTCHours() - 3 + 24) % 24;
    if (targetHour < 8) {
      if (!couple.unlocked_achievements?.includes("achievement:madrugador")) {
        bonus_earned += 15;
      }
      unlockSecretAchievement(store, coupleId, user_id, "madrugador", "🌅 Madrugador (Tarefa antes das 8h)", 0);
    }
    
    // 2. Combo: 3 tasks completed today
    const todayStr = new Date().toISOString().split("T")[0];
    const completedToday = store.tasks.filter((t: any) => 
      (t.coupleId || "couple_1") === coupleId && 
      t.completed && 
      t.completed_at && 
      t.completed_at.startsWith(todayStr) &&
      (t.completed_by === user_id || (t.responsible_id === user_id || t.responsible_id === "Ambos"))
    );
    if (completedToday.length === 3) {
      if (!couple.unlocked_achievements?.includes("achievement:combo")) {
        bonus_earned += 25;
      }
      unlockSecretAchievement(store, coupleId, user_id, "combo", "⚡ Combo Master (3 tarefas no mesmo dia)", 0);
      earnedCombo = true;
    }

    // 3. Mestre das Obrigações: 10 tasks completed today/recent
    if (completedToday.length >= 10) {
      if (!couple.unlocked_achievements?.includes("achievement:mestre_obrigacoes")) {
        bonus_earned += 50;
      }
      unlockSecretAchievement(store, coupleId, user_id, "mestre_obrigacoes", "🧹 Mestre das Obrigações (10 tarefas!)", 0);
    }
    
    // Allocate to the user who completed and the couple's total
    if (users[user_id]) {
      users[user_id].points_weekly += earnedPoints;
      
      const coins_base = task.coins ? task.coins : Math.max(5, Math.min(15, Math.round(earnedPoints * 0.5)));
      users[user_id].coins = (users[user_id].coins || 0) + (coins_base + bonus_earned);
      
      logActivity(store, "task_completed", `${user_id} completou a tarefa '${task.title}' (+${earnedPoints} EXP e +${coins_base + bonus_earned} moedas! 🪙)`);
    }
    couple.total_points += earnedPoints;

    // Recorrência automática de tarefas (automatic reproduction of completed recurring tasks)
    if (task.recurrence && task.recurrence !== "Nenhuma") {
      let baseDate = task.due_date ? new Date(task.due_date + "T12:00:00") : new Date();
      if (isNaN(baseDate.getTime())) {
        baseDate = new Date();
      }
      const nextDate = new Date(baseDate);
      if (task.recurrence === "Diária") {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (task.recurrence === "Semanal") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (task.recurrence === "Quinzenal") {
        nextDate.setDate(nextDate.getDate() + 14);
      } else if (task.recurrence === "Mensal") {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      const nextDueDateStr = nextDate.toISOString().split("T")[0];
      
      const recurringTask: any = {
        id: "task_rec_" + Date.now(),
        title: task.title,
        description: task.description,
        responsible_id: task.responsible_id,
        due_date: nextDueDateStr,
        recurrence: task.recurrence,
        category: task.category,
        priority: task.priority,
        time_estimate: task.time_estimate,
        points: task.points,
        completed: false,
        archived: false,
        comments: [],
        coupleId: (task as any).coupleId
      };
      store.tasks.push(recurringTask);
      logActivity(store, "task_recreated", `Agenda recorrente agendada para ${nextDueDateStr}: ${task.title}`);
    }

    // Check if new Home Level reached (progress 100 points per level)
    const nextLevel = Math.floor(couple.total_points / 100) + 1;
    if (nextLevel > couple.home_level) {
      couple.home_level = nextLevel;
      logActivity(store, "level_up", `🎉 Parabéns! O lar subiu para o Nível ${nextLevel} com ${couple.total_points} pontos!`);
    }
  } else {
    // Deduct when uncompleting (within 24h error margin)
    let penaltyPoints = task.priority === TaskPriority.URGENTE ? 25 : 10;
    if (task.due_date) {
      penaltyPoints += 5;
    }
    if (users[user_id]) {
      users[user_id].points_weekly = Math.max(0, users[user_id].points_weekly - penaltyPoints);
      const penaltyCoins = task.coins ? task.coins : Math.max(5, Math.min(15, Math.round(penaltyPoints * 0.5)));
      users[user_id].coins = Math.max(0, (users[user_id].coins || 0) - penaltyCoins);
    }
    couple.total_points = Math.max(0, couple.total_points - penaltyPoints);
    
    task.completed_at = undefined;
    task.photo_proof = undefined;
    logActivity(store, "task_undone", `${user_id} reabriu a tarefa '${task.title}'.`);
  }

  db.saveStore();
  res.json({ success: true, task, couple, users, earnedCombo });
});

// Soft Delete / Archive
app.post("/api/tasks/archive", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  const task = store.tasks.find(t => t.id === id);
  if (task) {
    task.archived = !task.archived;
    db.saveStore();
    res.json({ success: true, task });
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

// Transfer Task
app.post("/api/tasks/transfer", (req, res) => {
  const { id, fromUser, message } = req.body;
  const store = db.getStore();
  const task = store.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: "Task not found." });

  const targetUser = fromUser === "Leandro" ? "Kaisa" : "Leandro";
  task.responsible_id = targetUser;
  
  if (message && message.trim() !== "") {
    task.comments.push({
      id: "comment_" + Date.now(),
      author_id: fromUser,
      text: `🔄 ${fromUser} transferiu para ${targetUser}: "${message}"`,
      timestamp: new Date().toISOString()
    });
  }

  logActivity(store, "task_transferred", `🔄 ${fromUser} transferiu a tarefa '${task.title}' para ${targetUser}.`);
  db.saveStore();
  res.json({ success: true, task });
});

// Task Comment / Chat
app.post("/api/tasks/comment", (req, res) => {
  const { task_id, author_id, text } = req.body;
  const store = db.getStore();
  const task = store.tasks.find(t => t.id === task_id);
  
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  const newComment = {
    id: "comment_" + Date.now(),
    author_id,
    text: text || "",
    timestamp: new Date().toISOString()
  };

  task.comments.push(newComment);
  db.saveStore();
  res.json({ success: true, comment: newComment, task });
});


// ================= FEED MODULE =================
app.post("/api/feed/react", (req, res) => {
  const { timestampStr, emoji, userId } = req.body;
  const store = db.getStore();
  const { coupleId } = getRequestCredentials(req);
  const userCouple = store.couples ? store.couples[coupleId] : store.couple;

  if (!userCouple) return res.status(404).json({ error: "Couple not found" });

  if (!userCouple.feed_reactions) {
    userCouple.feed_reactions = {};
  }
  if (!userCouple.feed_reactions[timestampStr]) {
    userCouple.feed_reactions[timestampStr] = {};
  }
  
  const currentReaction = userCouple.feed_reactions[timestampStr][userId];
  if (currentReaction === emoji) {
    // Toggle off
    delete userCouple.feed_reactions[timestampStr][userId];
  } else {
    userCouple.feed_reactions[timestampStr][userId] = emoji;
  }

  db.saveStore();
  res.json({ success: true, reactions: userCouple.feed_reactions[timestampStr] });
});

// ================= SHOPPING & INVENTORY MODULE =================

// Add Item
app.post("/api/shopping/create", (req, res) => {
  const { name, category, quantity, unit, price, added_by, suggested, reason_suggested, monthId } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const store = db.getStore();
  const targetMonthId = monthId || "2026-05";
  
  // Clean duplicate checks (e.g. "leite" / "leite integral") in the same active list
  const lowercaseName = name.trim().toLowerCase();
  const duplicate = store.shopping.find(
    i => !i.is_bought && 
         (i.monthId === targetMonthId || (!i.monthId && targetMonthId === "2026-05")) && 
         i.name.trim().toLowerCase() === lowercaseName
  );

  if (duplicate) {
    return res.json({ 
      success: true, 
      warning: "Duplicate detected", 
      message: `O item '${name}' já existe na lista pendente deste mês!`, 
      item: duplicate 
    });
  }

  // Auto Category Mapper helper
  let resolvedCategory = category || ShoppingCategory.OUTROS;
  if (!category) {
    const listHorti = ["banana", "maçã", "tomate", "cebola", "alho", "laranja", "batata", "alface", "fruta", "legume"];
    const listLati = ["leite", "queijo", "iogurte", "manteiga", "requeijão", "creme", "sorvete", "yakult"];
    const listCarne = ["carne", "frango", "peixe", "alcatra", "mignon", "porco", "peito", "linguiça", "salsicha"];
    const listLimp = ["detergente", "sabão", "desinfetante", "cloro", "pano", "amaciante", "água sanitária"];
    const listHigi = ["papel higiênico", "sabonete", "shampoo", "creme de dente", "pasta de dente", "fio dental"];

    const isMatch = (arr: string[]) => arr.some(kw => lowercaseName.includes(kw));

    if (isMatch(listHorti)) resolvedCategory = ShoppingCategory.HORTIFRUTI;
    else if (isMatch(listLati)) resolvedCategory = ShoppingCategory.LATICINIOS;
    else if (isMatch(listCarne)) resolvedCategory = ShoppingCategory.CARNES;
    else if (isMatch(listLimp)) resolvedCategory = ShoppingCategory.LIMPEZA;
    else if (isMatch(listHigi)) resolvedCategory = ShoppingCategory.HIGIENE;
  }

  const newItem: ShoppingItem = {
    id: "shop_" + Date.now(),
    name,
    category: resolvedCategory,
    quantity: quantity ? parseFloat(quantity) : 1,
    unit: unit || "unidades",
    price: price ? parseFloat(price) : undefined,
    is_bought: false,
    added_by: added_by || "Parceiro",
    suggested: !!suggested,
    reason_suggested: reason_suggested || undefined,
    monthId: targetMonthId,
    listStatus: "active"
  };

  store.shopping.push(newItem);
  db.saveStore();
  res.json({ success: true, item: newItem });
});

// Add Multiple Items in Bulk (Quick Add)
app.post("/api/shopping/create-bulk", (req, res) => {
  const { items, added_by, monthId } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Items array is required" });
  }

  const store = db.getStore();
  const addedItems: any[] = [];
  const duplicates: string[] = [];
  const targetMonthId = monthId || "2026-05";

  for (const item of items) {
    if (!item.name) continue;
    
    const name = item.name.trim();
    const lowercaseName = name.toLowerCase();
    
    // Check duplicate
    const duplicate = store.shopping.find(
      i => !i.is_bought && 
           (i.monthId === targetMonthId || (!i.monthId && targetMonthId === "2026-05")) && 
           i.name.trim().toLowerCase() === lowercaseName
    );

    if (duplicate) {
      duplicates.push(name);
      continue;
    }

    // Auto Category Mapper helper
    let resolvedCategory = item.category || ShoppingCategory.OUTROS;
    if (!item.category) {
      const listHorti = ["banana", "maçã", "tomate", "cebola", "alho", "laranja", "batata", "alface", "fruta", "legume"];
      const listLati = ["leite", "queijo", "iogurte", "manteiga", "requeijão", "creme", "sorvete", "yakult"];
      const listCarne = ["carne", "frango", "peixe", "alcatra", "mignon", "porco", "peito", "linguiça", "salsicha"];
      const listLimp = ["detergente", "sabão", "desinfetante", "cloro", "pano", "amaciante", "água sanitária"];
      const listHigi = ["papel higiênico", "sabonete", "shampoo", "creme de dente", "pasta de dente", "fio dental"];

      const isMatch = (arr: string[]) => arr.some(kw => lowercaseName.includes(kw));

      if (isMatch(listHorti)) resolvedCategory = ShoppingCategory.HORTIFRUTI;
      else if (isMatch(listLati)) resolvedCategory = ShoppingCategory.LATICINIOS;
      else if (isMatch(listCarne)) resolvedCategory = ShoppingCategory.CARNES;
      else if (isMatch(listLimp)) resolvedCategory = ShoppingCategory.LIMPEZA;
      else if (isMatch(listHigi)) resolvedCategory = ShoppingCategory.HIGIENE;
    }

    const newItem: ShoppingItem = {
      id: "shop_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      name,
      category: resolvedCategory,
      quantity: item.quantity ? parseFloat(item.quantity) : 1,
      unit: item.unit || "unidades",
      price: item.price ? parseFloat(item.price) : undefined,
      is_bought: false,
      added_by: added_by || "Parceiro",
      monthId: targetMonthId,
      listStatus: "active"
    };

    store.shopping.push(newItem);
    addedItems.push(newItem);
  }

  db.saveStore();
  res.json({ success: true, addedItems, duplicates });
});

// Toggle Bought - simple checkoff (removed automatic inventory sync or complicated automatic additions)
app.post("/api/shopping/toggle", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  const item = store.shopping.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  item.is_bought = !item.is_bought;
  item.bought_at = item.is_bought ? new Date().toISOString() : undefined;

  if (item.is_bought) {
    logActivity(store, "shopping", `🛒 Compra Selecionada: '${item.name}' (${item.quantity} ${item.unit}) foi riscado.`);
  } else {
    logActivity(store, "shopping_removed", `🛒 Compra Desmarcada: '${item.name}' está pendente.`);
  }

  db.saveStore();
  res.json({ success: true, item, shopping: store.shopping });
});

// Delete item
app.post("/api/shopping/delete", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  store.shopping = store.shopping.filter(i => i.id !== id);
  db.saveStore();
  res.json({ success: true });
});

// Update or set budget for a given month
app.post("/api/shopping/budget", (req, res) => {
  const { monthId, budget } = req.body;
  if (!monthId) {
    return res.status(400).json({ error: "monthId is required" });
  }
  const store = db.getStore();
  if (!store.couple.shoppingBudgets) {
    store.couple.shoppingBudgets = {};
  }
  store.couple.shoppingBudgets[monthId] = parseFloat(budget) || 0;
  db.saveStore();
  res.json({ success: true, shoppingBudgets: store.couple.shoppingBudgets });
});

// Update single item fields inline in real-time
app.post("/api/shopping/update", (req, res) => {
  const { id, name, quantity, unit, price, category } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Item ID is required" });
  }

  const store = db.getStore();
  const item = store.shopping.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  if (name !== undefined) item.name = name;
  if (quantity !== undefined) item.quantity = parseFloat(quantity) || 0;
  if (unit !== undefined) item.unit = unit;
  if (price !== undefined) item.price = price !== null && price !== "" ? parseFloat(price) : undefined;
  if (category !== undefined) item.category = category;

  db.saveStore();
  res.json({ success: true, item, shopping: store.shopping });
});

// Finalize a monthly list and log into expenses
app.post("/api/shopping/finalize", (req, res) => {
  const { monthId, paymentMethod, totalSpent, paid_by_id, carryOver } = req.body;
  if (!monthId) {
    return res.status(400).json({ error: "monthId is required" });
  }

  const store = db.getStore();
  
  // Find all items for this month (handling defaults)
  const currentMonthId = monthId;
  const nextMonthId = (() => {
    const [y, m] = currentMonthId.split("-").map(Number);
    if (!m) return "2026-06";
    let nextY = y;
    let nextM = m + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    return `${nextY}-${String(nextM).padStart(2, "0")}`;
  })();

  const monthItems = store.shopping.filter(
    i => (i.monthId === currentMonthId || (!i.monthId && currentMonthId === "2026-05"))
  );

  if (monthItems.length === 0) {
    return res.status(400).json({ error: "Nenhum item nesta lista para finalizar." });
  }

  const actualSpent = totalSpent !== undefined ? parseFloat(totalSpent) : 0;
  
  // Calculate estimated total based on items checked/bought this month
  const estimatedTotal = monthItems
    .filter(i => i.is_bought)
    .reduce((acc, i) => acc + ((i.price || 0) * i.quantity), 0);

  const difference = estimatedTotal - actualSpent;

  // Store detailed finalization record in a custom array on couple
  if (!store.couple.shoppingFinalizations) {
    (store.couple as any).shoppingFinalizations = [];
  }
  
  (store.couple as any).shoppingFinalizations.push({
    id: "fin_" + Date.now(),
    monthId: currentMonthId,
    estimatedTotal,
    realTotal: actualSpent,
    difference,
    paymentMethod: paymentMethod || "Não Informado",
    paidBy: paid_by_id || "Leandro",
    date: new Date().toISOString()
  });

  // Process items
  for (const item of monthItems) {
    if (item.is_bought) {
      item.listStatus = "finalized";
      item.paymentMethod = paymentMethod || "Não Informado";
    } else if (carryOver) {
      // Carry over unchecked items to the next month!
      item.monthId = nextMonthId;
      item.listStatus = "active";
    } else {
      // Keep in current month but archived/finalized status
      item.listStatus = "finalized";
    }
  }

  // Create financial integration expense
  const helperFormatMonth = (ym: string) => {
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const parts = ym.split("-");
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    if (isNaN(m) || m < 1 || m > 12) return ym;
    return `${months[m - 1]}/${y}`;
  };

  const readableMonth = helperFormatMonth(monthId);

  const mapPaymentMethod = (method: string): any => {
    if (!method) return "Outro";
    const lower = method.toLowerCase();
    if (lower === "débito" || lower === "debito") return "Débito";
    if (lower === "crédito" || lower === "credito") return "Crédito";
    if (lower === "pix") return "Pix";
    if (lower === "dinheiro") return "Dinheiro";
    if (lower === "carteira digital" || lower === "vr" || lower === "carteira") return "Carteira digital";
    return "Outro";
  };

  const newExpense: Expense = {
    id: "exp_shop_final_" + Date.now(),
    value: actualSpent,
    currency: "R$",
    description: `Lista de Compras de ${readableMonth} - Método: ${paymentMethod || "Não Informado"}`,
    paid_by_id: paid_by_id || "Leandro",
    split_type: "50/50",
    category: ExpenseCategory.ALIMENTACAO,
    date: new Date().toISOString().split("T")[0],
    is_recurring: false,
    payment_method: mapPaymentMethod(paymentMethod)
  };

  store.expenses.push(newExpense);

  logActivity(
    store,
    "shopping_finalized",
    `✅ Lista de ${readableMonth} finalizada por ${paid_by_id}! R$ ${actualSpent.toLocaleString("pt-BR", {minimumFractionDigits: 2})} pagos via ${paymentMethod || "Não Informado"} lançados automaticamente nas finanças.`
  );

  db.saveStore();
  res.json({ success: true, expenses: store.expenses, shopping: store.shopping, shoppingFinalizations: (store.couple as any).shoppingFinalizations });
});

// ================= HOUSE INVENTORY MODULE =================

// Add or edit stock manually (removed auto check-off triggers)
app.post("/api/inventory/update", (req, res) => {
  const { id, name, quantity, min_quantity, unit } = req.body;
  const store = db.getStore();
  
  const checkAndAddToShopping = (item: any) => {
    if (item.quantity < item.min_quantity) {
      const today = new Date();
      const currentMonthId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      const lowercaseName = item.name.trim().toLowerCase();
      const exists = store.shopping.find(
        (s: any) => !s.is_bought && 
             (s.monthId === currentMonthId) && 
             s.name.trim().toLowerCase() === lowercaseName
      );
      if (!exists) {
        const newShopItem = {
          id: "shop_inv_" + Date.now(),
          name: item.name,
          category: ShoppingCategory.OUTROS,
          quantity: Math.max(1, Math.ceil(item.min_quantity - item.quantity)),
          unit: item.unit,
          price: 0,
          is_bought: false,
          added_by: "Estoque Baixo",
          monthId: currentMonthId,
          coupleId: item.coupleId
        };
        store.shopping.push(newShopItem as any);
        logActivity(store, "inventory_low", `Estoque baixo: '${item.name}' caiu para ${item.quantity} ${item.unit}. Item inserido no carrinho! 🛒`);
      }
    }
  };

  if (id) {
    const item = store.inventory.find(i => i.id === id);
    if (item) {
      item.quantity = parseFloat(quantity);
      if (min_quantity !== undefined) item.min_quantity = parseFloat(min_quantity);
      if (unit) item.unit = unit;
      
      checkAndAddToShopping(item);
      db.saveStore();
      return res.json({ success: true, item, shopping: store.shopping });
    }
  } else if (name) {
    const newItem = {
      id: "inv_" + Date.now(),
      name,
      quantity: parseFloat(quantity) || 0,
      unit: unit || "unidades",
      min_quantity: parseFloat(min_quantity) || 1
    };
    store.inventory.push(newItem);
    
    checkAndAddToShopping(newItem);
    db.saveStore();
    return res.json({ success: true, item: newItem, shopping: store.shopping });
  }
  res.status(400).json({ error: "Invalid action" });
});

// ================= QUICK NOTES / ANOTAÇÕES RÁPIDAS (COISAS QUE ACABAM DO NADA) =================

app.post("/api/quick-notes/create", (req, res) => {
  const { text, authorId } = req.body;
  
  if (!text || !authorId) {
    return res.status(400).json({ error: "Required fields missing" });
  }
  
  const store = db.getStore();
  if (!store.quickNotes) {
    store.quickNotes = [];
  }
  
  const newNote = {
    id: "note_" + Date.now(),
    text,
    authorId,
    createdAt: new Date().toISOString()
  };
  
  store.quickNotes.push(newNote);
  db.saveStore();
  
  logActivity(store, "note", `📝 ${authorId} adicionou nota rápida: "${text}"`);
  
  res.json({ success: true, note: newNote, quickNotes: store.quickNotes });
});

app.post("/api/quick-notes/delete", (req, res) => {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: "Required fields missing" });
  }
  
  const store = db.getStore();
  if (!store.quickNotes) {
    store.quickNotes = [];
  }
  
  store.quickNotes = store.quickNotes.filter(n => n.id !== id);
  db.saveStore();
  
  res.json({ success: true, quickNotes: store.quickNotes });
});

// ================= FINANÇAS COMPARTILHADAS =================

// Create expense
app.post("/api/expenses/create", (req, res) => {
  const { 
    value, 
    currency, 
    description, 
    paid_by_id, 
    split_type, 
    custom_percent, 
    category, 
    date, 
    is_recurring,
    payment_method,
    card_name,
    installments_total,
    installments_current,
    monthly_installment_value
  } = req.body;
  
  if (!value || !description || !paid_by_id) {
    return res.status(400).json({ error: "Required fields missing" });
  }

  const store = db.getStore();
  const newExpense: Expense = {
    id: "exp_" + Date.now(),
    value: parseFloat(value),
    currency: currency || "R$",
    description: description.slice(0, 100),
    paid_by_id,
    split_type: split_type || "50/50",
    custom_percent: custom_percent ? parseFloat(custom_percent) : undefined,
    category: category || ExpenseCategory.OUTROS,
    date: date || new Date().toISOString().split("T")[0],
    is_recurring: !!is_recurring,
    payment_method: payment_method || undefined,
    card_name: card_name || undefined,
    installments_total: installments_total ? parseInt(installments_total, 10) : undefined,
    installments_current: installments_current ? parseInt(installments_current, 10) : undefined,
    monthly_installment_value: monthly_installment_value ? parseFloat(monthly_installment_value) : undefined
  };

  store.expenses.push(newExpense);
  db.saveStore();
  res.json({ success: true, expense: newExpense });
});

// Delete expense (soft delete)
app.post("/api/expenses/delete", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  store.expenses = store.expenses.filter(e => e.id !== id);
  db.saveStore();
  res.json({ success: true });
});

app.post("/api/expenses/toggle-paid", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  const expense = store.expenses.find(e => e.id === id);
  if (!expense) {
    return res.status(404).json({ error: "Expense not found" });
  }
  expense.is_paid_this_month = !expense.is_paid_this_month;
  db.saveStore();
  res.json({ success: true, expense });
});

// Dynamic Rewards Enpoints
app.post("/api/rewards/create", (req, res) => {
  const { title, cost, desc, emoji, is_repeatable, linked_task_id } = req.body;
  if (!title || !cost) {
    return res.status(400).json({ error: "Required fields missing" });
  }
  const store = db.getStore();
  const newReward: Reward = {
    id: "reward_" + Date.now(),
    title,
    cost: parseInt(cost),
    desc: desc || "",
    emoji: emoji || "🎁",
    is_repeatable: is_repeatable === undefined ? true : !!is_repeatable,
    linked_task_id: linked_task_id || undefined
  };
  if (!store.rewards) store.rewards = [];
  store.rewards.push(newReward);
  db.saveStore();
  res.json({ success: true, reward: newReward });
});

app.post("/api/rewards/delete", (req, res) => {
  const { id } = req.body;
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();
  if (!store.rewards) store.rewards = [];
  store.rewards = store.rewards.filter(r => r.id !== id);
  
  // Cleanup roulette items for all users in the couple
  const { users } = getCoupleAndUsers(store, coupleId);
  Object.values(users).forEach((user: any) => {
    if (user.roulette_items && user.roulette_items.includes(id)) {
      user.roulette_items = user.roulette_items.filter((rId: string) => rId !== id);
    }
  });

  db.saveStore();
  res.json({ success: true, message: "Recompensa deletada." });
});

// Dynamic Quests / Missões Endpoints
app.post("/api/quests/create", (req, res) => {
  const { title, description, points, coins, type, target_count } = req.body;
  if (!title || !points) {
    return res.status(400).json({ error: "Required fields missing" });
  }
  const store = db.getStore();
  const newQuest: Quest = {
    id: "quest_" + Date.now(),
    title,
    description: description || "",
    points: parseInt(points) || 10,
    coins: coins ? parseInt(coins) : undefined,
    type: type || "Custom",
    target_count: req.body.target_count ? parseInt(req.body.target_count) : undefined,
    current_count: req.body.target_count ? 0 : undefined,
    combined_target: req.body.combined_target ? parseInt(req.body.combined_target) : undefined,
    combined_current: req.body.combined_target ? 0 : undefined,
    completed: false
  };
  if (!store.quests) store.quests = [];
  store.quests.push(newQuest);
  db.saveStore();
  res.json({ success: true, quest: newQuest });
});

app.post("/api/quests/contribute", (req, res) => {
  const { id, user_id, coupleId } = req.body;
  const store = db.getStore();
  if (!store.quests) store.quests = [];
  const quest = store.quests.find(q => q.id === id);
  if (!quest) {
    return res.status(404).json({ error: "Quest not found" });
  }

  const { users } = getCoupleAndUsers(store, coupleId || "couple_1");

  if (quest.combined_target) {
    quest.combined_current = (quest.combined_current || 0) + 1;
    let userName = users[user_id]?.name || user_id;
    logActivity(store, "quest_contributed", `🤝 ${userName} contribuiu para a missão cooperativa '${quest.title}'! (${quest.combined_current}/${quest.combined_target})`);
  }

  db.saveStore();
  res.json({ success: true, quest });
});

app.post("/api/quests/delete", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  if (!store.quests) store.quests = [];
  store.quests = store.quests.filter(q => q.id !== id);
  db.saveStore();
  res.json({ success: true });
});

app.post("/api/quests/toggle-complete", (req, res) => {
  const { id, user_id, coupleId } = req.body;
  const store = db.getStore();
  if (!store.quests) store.quests = [];
  const quest = store.quests.find(q => q.id === id);
  if (!quest) {
    return res.status(404).json({ error: "Quest not found" });
  }

  const { couple, users } = getCoupleAndUsers(store, coupleId || "couple_1");
  
  if (couple.coins === undefined) {
    couple.coins = couple.total_points || 0;
  }
  
  quest.completed = !quest.completed;
  
  if (quest.completed) {
    let earnedXP = quest.points;
    const hasMultiplier = couple.xp_multiplier_until && new Date(couple.xp_multiplier_until) > new Date();
    if (hasMultiplier) earnedXP = Math.round(earnedXP * 1.1);

    couple.total_points += earnedXP;
    
    // Reward custom coins if it has, or calculate. Give to both if it's combined, otherwise to the completer.
    const finalCoins = quest.coins ? quest.coins : Math.max(5, Math.min(25, Math.round(earnedXP * 0.5)));
    
    if (user_id && users[user_id]) {
      users[user_id].coins = (users[user_id].coins || 0) + finalCoins;
      users[user_id].points_weekly += earnedXP;
      
      // se for coop, e o outro usuário existir, dar pra ele tbm
      if (quest.combined_target) {
        const otherUser = user_id === "Leandro" ? "Kaisa" : "Leandro";
        if (users[otherUser]) {
           users[otherUser].coins = (users[otherUser].coins || 0) + finalCoins;
           users[otherUser].points_weekly += earnedXP;
        }
      }
    }
    
    let bonusInfo = "";
    if (quest.combined_target && (!quest.deadline || new Date() <= new Date(quest.deadline))) {
      couple.xp_multiplier_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      bonusInfo = " BÔNUS: +10% XP Global p/ próximas 24h! 🚀";
    }

    logActivity(store, "quest_completed", `🎯 Missão '${quest.title}' cumprida! (+${earnedXP} XP e +${finalCoins} moedas! 🪙)${bonusInfo}`);
  } else {

    couple.total_points = Math.max(0, couple.total_points - quest.points);
    const finalCoins = quest.coins ? quest.coins : Math.max(5, Math.min(25, Math.round(quest.points * 0.5)));
    
    if (user_id && users[user_id]) {
      users[user_id].coins = Math.max(0, (users[user_id].coins || 0) - finalCoins);
      users[user_id].points_weekly = Math.max(0, users[user_id].points_weekly - quest.points);
      
      // se for coop, remover do outro também
      if (quest.combined_target) {
        const otherUser = user_id === "Leandro" ? "Kaisa" : "Leandro";
        if (users[otherUser]) {
           users[otherUser].coins = Math.max(0, (users[otherUser].coins || 0) - finalCoins);
           users[otherUser].points_weekly = Math.max(0, users[otherUser].points_weekly - quest.points);
        }
      }
    }
  }

  db.saveStore();
  res.json({ success: true, quest, couple, users });
});

// ================= CALENDÁRIO DO CASAL =================

app.post("/api/events/create", (req, res) => {
  const { title, description, type, start_time, end_time, location, travel_checklist, booking_link, responsible_id } = req.body;
  if (!title || !start_time || !type) {
    return res.status(400).json({ error: "Missing required fields for event" });
  }

  const store = db.getStore();
  if (!store.events) store.events = [];
  const newEvent: Event = {
    id: "event_" + Date.now(),
    title,
    description,
    type,
    start_time,
    end_time,
    location,
    travel_checklist: travel_checklist || (type === EventType.VIAGEM ? [] : undefined),
    booking_link,
    responsible_id: responsible_id || "Ambos",
    comments: []
  };

  store.events.push(newEvent);
  db.saveStore();
  res.json({ success: true, event: newEvent });
});

// Toggle travel checklist items
app.post("/api/events/checklist/toggle", (req, res) => {
  const { event_id, item_text } = req.body;
  const store = db.getStore();
  const event = store.events.find(e => e.id === event_id);
  
  if (!event || !event.travel_checklist) {
    return res.status(404).json({ error: "Event or travel checklist not found" });
  }

  const checkItem = event.travel_checklist.find(i => i.item === item_text);
  if (checkItem) {
    checkItem.checked = !checkItem.checked;
    db.saveStore();
    res.json({ success: true, event });
  } else {
    res.status(404).json({ error: "Checklist item not found" });
  }
});

// Add items to checklist item
app.post("/api/events/checklist/add", (req, res) => {
  const { event_id, item_text } = req.body;
  const store = db.getStore();
  const event = store.events.find(e => e.id === event_id);
  
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  if (!event.travel_checklist) {
    event.travel_checklist = [];
  }

  event.travel_checklist.push({ item: item_text, checked: false });
  db.saveStore();
  res.json({ success: true, event });
});

// ================= MEMÓRIAS & ÁLBUM =================

app.post("/api/memories/create", (req, res) => {
  const { url, description, date, location, album_name, is_capsule, capsule_unlock_date } = req.body;
  if (!url || !description) {
    return res.status(400).json({ error: "Photo URL and description are required" });
  }

  const store = db.getStore();
  const newMemory: Memory = {
    id: "mem_" + Date.now(),
    url,
    description,
    date: date || new Date().toISOString().split("T")[0],
    location,
    album_name: album_name || "Geral",
    is_capsule: !!is_capsule,
    capsule_unlock_date: capsule_unlock_date || undefined,
    created_at: new Date().toISOString()
  };

  store.memories.push(newMemory);
  db.saveStore();
  res.json({ success: true, memory: newMemory });
});

// ================= HUMOR & CHECK-IN EMOCIONAL =================

app.post("/api/moods/checkin", (req, res) => {
  const { user_id, mood, note, share_note } = req.body;
  if (!user_id || !mood) {
    return res.status(400).json({ error: "User ID and mood are required" });
  }

  const store = db.getStore();
  const todayStr = new Date().toISOString().split("T")[0];
  
  // Find today's checkin for this user to update or append
  let checkin = store.moods.find(m => m.user_id === user_id && m.date === todayStr);
  
  if (checkin) {
    checkin.mood = mood;
    checkin.note = note || "";
    checkin.share_note = !!share_note;
  } else {
    checkin = {
      id: "mood_" + Date.now(),
      user_id,
      mood,
      note: note || "",
      share_note: !!share_note,
      date: todayStr
    };
    store.moods.push(checkin);

    // Recompensa de Moedas por Check-in no dia
    const { coupleId } = getRequestCredentials(req);
    const { users } = getCoupleAndUsers(store, coupleId || "couple_1");
    if (users[user_id]) {
      users[user_id].coins = (users[user_id].coins || 0) + 15;
    }
  }

  logActivity(store, "mood", `✨ Sintonia do Amor: ${user_id} atualizou o humor para '${mood}'${note ? `: "${note}"` : ""}`);

  // Paz Selada Achievement Check
  if (mood === "Ótimo" || mood === "Bem") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split("T")[0];
    const yesterdayCheckin = store.moods.find((m: any) => m.user_id === user_id && m.date === yesterdayStr);
    if (yesterdayCheckin && (yesterdayCheckin.mood === "Ansioso" || yesterdayCheckin.mood === "Na baixa" || yesterdayCheckin.mood === "Cansado")) {
      const { coupleId } = getRequestCredentials(req);
      unlockSecretAchievement(store, coupleId || "couple_1", user_id, "paz_selada", "🕊️ Paz Selada (Humor Ótimo após dia Tenso/Cansado)", 20);
    }
  }

  db.saveStore();
  res.json({ success: true, checkin });
});


// ================= WISHLIST MODULE =================

app.post("/api/wishlist/create", (req, res) => {
  const { name, link, estimated_price, priority, is_private_to_partner, category, saving_goal, currency_type, added_by } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: "Name and category are required" });
  }

  const store = db.getStore();
  const newItem: WishlistItem = {
    id: "wish_" + Date.now(),
    name,
    link,
    estimated_price: estimated_price ? parseFloat(estimated_price) : undefined,
    priority: priority || "Média",
    is_private_to_partner: !!is_private_to_partner,
    category,
    currency_type: currency_type || "BRL",
    saving_goal: saving_goal ? parseFloat(saving_goal) : undefined,
    saving_saved: saving_goal ? 0 : undefined,
    added_by: added_by || "Ambos"
  };

  store.wishlist.push(newItem);
  db.saveStore();
  res.json({ success: true, item: newItem });
});

// Contribute saving to cofrinho
app.post("/api/wishlist/save", (req, res) => {
  const { id, amount, userId, coupleId } = req.body;
  const store = db.getStore();
  const item = store.wishlist.find(w => w.id === id);
  if (!item || item.saving_goal === undefined) {
    return res.status(404).json({ error: "Wishlist cofrinho not found" });
  }

  const { users } = getCoupleAndUsers(store, coupleId || "couple_1");

  const depositAmt = parseFloat(amount);
  
  if (item.currency_type === "COINS") {
    // Deduct coins from user
    if (users[userId]) {
      if ((users[userId].coins || 0) < depositAmt) {
        return res.status(400).json({ error: "Moedas insuficientes para este depósito!" });
      }
      users[userId].coins -= depositAmt;
    }
  }

  const current = item.saving_saved || 0;
  item.saving_saved = Math.min(item.saving_goal, current + depositAmt);

  // Reward 10 coins for financial savings (if real money)
  if (item.currency_type !== "COINS" && users[userId]) {
    users[userId].coins = (users[userId].coins || 0) + 10;
  }

  db.saveStore();
  res.json({ success: true, item, users, message: item.currency_type !== "COINS" ? "Depósito computado e +10 moedas para você! 🎉" : undefined });
});

// Comprar/Realizar e Subtrair
app.post("/api/wishlist/complete", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  
  // Actually, we can just remove it from the wishlist since it's accomplished!
  store.wishlist = store.wishlist.filter(w => w.id !== id);
  db.saveStore();
  res.json({ success: true });
});

// ================= RECEITAS & CARDÁPIO SEMANAL =================

app.post("/api/recipes/create", (req, res) => {
  const { title, ingredients, instructions, duration, portions, couple_rating, tags, url } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Recipe title is required" });
  }

  const store = db.getStore();
  const newRecipe: Recipe = {
    id: "rec_" + Date.now(),
    title,
    ingredients: Array.isArray(ingredients) ? ingredients : [ingredients],
    instructions: instructions || "",
    duration: duration ? parseInt(duration, 10) : 30,
    portions: portions ? parseInt(portions, 10) : 2,
    couple_rating: couple_rating || undefined,
    tags: tags || [],
    photo_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300"
  };

  store.recipes.push(newRecipe);
  db.saveStore();
  res.json({ success: true, recipe: newRecipe });
});

// Import Recipe simulation (via URL context)
app.post("/api/recipes/import-url", (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  // Simulated scraped data based on some URLs or fallback
  const store = db.getStore();
  const scrapeTitle = url.includes("panelinha") ? "Risoto de Abóbora Panelinha" : "Bolo Formiga Especial";
  const ingreds = url.includes("panelinha") 
    ? ["Abóbora cabotiá picada - 400g", "Arroz arbóreo - 1.5 xícaras", "Parmesão ralado - 80g", "Cebola ralada", "Vinho branco seco - 100ml"]
    : ["Farinha de trigo - 2 xícaras", "Granulado de chocolate - 100g", "Ovos grandes - 3 unidades", "Manteiga amolecida - 100g", "Leite morno"];

  const newRecipe: Recipe = {
    id: "rec_scraped_" + Date.now(),
    title: scrapeTitle,
    ingredients: ingreds,
    instructions: "1. Prepare o batedor ou panela conforme as instruções tradicionais.\n2. Incorpore os ingredientes em fogo brando.\n3. Misture devagar e sirva em porções generosas para o casal adorar.",
    duration: 35,
    portions: 4,
    couple_rating: "Favorita",
    tags: ["rápida", "econômica"],
    photo_url: "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&q=80&w=300"
  };

  store.recipes.push(newRecipe);
  db.saveStore();
  res.json({ success: true, recipe: newRecipe });
});

app.post("/api/recipes/rate", (req, res) => {
  const { id, rating } = req.body; // "Gostamos" | "Não repetir" | "Favorita"
  const store = db.getStore();
  const recipe = store.recipes.find(r => r.id === id);
  if (recipe) {
    recipe.couple_rating = rating;
    db.saveStore();
    res.json({ success: true, recipe });
  } else {
    res.status(404).json({ error: "Recipe not found" });
  }
});

// Generate grocery list automatically from recipe items
app.post("/api/recipes/generate-shopping", (req, res) => {
  const { recipe_id, user_id } = req.body;
  const store = db.getStore();
  const recipe = store.recipes.find(r => r.id === recipe_id);
  if (!recipe) {
    return res.status(404).json({ error: "Recipe not found" });
  }

  const addedItems: string[] = [];
  recipe.ingredients.forEach(rawIng => {
    // split amount
    const cleanName = rawIng.includes("-") ? rawIng.split("-")[0].trim() : rawIng.trim();
    
    // check redundancy
    const exists = store.shopping.some(s => !s.is_bought && s.name.toLowerCase() === cleanName.toLowerCase());
    if (!exists) {
      store.shopping.push({
        id: "shop_rec_" + Date.now() + Math.random().toString(36).substring(3, 8),
        name: cleanName,
        category: ShoppingCategory.OUTROS,
        quantity: 1,
        unit: "porção",
        is_bought: false,
        added_by: user_id || "Receitas"
      });
      addedItems.push(cleanName);
    }
  });

  db.saveStore();
  res.json({ success: true, added: addedItems, shopping: store.shopping });
});

// Update weekly plan slot
app.post("/api/mealplan/update", (req, res) => {
  const { day, meal_type, recipe_id, custom_text } = req.body;
  const store = db.getStore();
  
  const slotId = `${day}-${meal_type}`;
  let slot = store.mealPlan.find(m => m.id === slotId);
  
  if (slot) {
    slot.recipe_id = recipe_id || undefined;
    slot.custom_text = custom_text || undefined;
  } else {
    slot = {
      id: slotId,
      day,
      meal_type,
      recipe_id: recipe_id || undefined,
      custom_text: custom_text || undefined
    };
    store.mealPlan.push(slot);
  }

  db.saveStore();
  res.json({ success: true, slot });
});


// ================= CHAT CONTEXTUAL =================

// Add quick contextual comments on any list shop item, calendar event or task
app.post("/api/chat/comment", (req, res) => {
  const { scope_type, scope_id, text, sender_id } = req.body; // scope_type: task, event, shop
  const store = db.getStore();
  
  const comment = {
    id: "c_" + Date.now(),
    author_id: sender_id || "Leandro",
    text: text || "",
    timestamp: new Date().toISOString()
  };

  if (scope_type === "task") {
    const task = store.tasks.find(t => t.id === scope_id);
    if (task) task.comments.push(comment);
  } else if (scope_type === "event") {
    const event = store.events.find(e => e.id === scope_id);
    if (event) event.comments.push(comment);
  } else if (scope_type === "shop") {
    // we can record it as custom log or directly
  }

  db.saveStore();
  res.json({ success: true, comment });
});


// ================= GEMINI AFFECTIVE IA =================

// Endpoint for smart emotional coaching and housekeeping tips
app.post("/api/gemini/insights", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const client = getAiClient();
  const store = db.getStore();
  const { couple, users } = getCoupleAndUsers(store, coupleId);
  
  const p1Name = users.Leandro?.name || "Leandro";
  const p2Name = users.Kaisa?.name || "Kaisa";

  const incompleteTasks = (store.tasks || []).filter((t: any) => t.coupleId === coupleId && !t.completed).map((t: any) => `${t.title} (${t.responsible_id})`).join(", ");
  const recentMoods = (store.moods || []).filter((m: any) => m.coupleId === coupleId).slice(-6).map((m: any) => `${m.user_id}: ${m.mood} (${m.note || "Sem nota"})`).join(", ");
  const coupleStats = `Nível do Lar: ${couple.home_level}, Total Pontos: ${couple.total_points}. Pontos ${p1Name}: ${users.Leandro?.points_weekly || 0}, Pontos ${p2Name}: ${users.Kaisa?.points_weekly || 0}`;

  const prompt = `Atue como o assistente emocional "IA Afetiva" do aplicativo de casal NósDois.
  Analise os dados atuais do lar e dê um feedback carinhoso, empático e sutil de até 3 frases em Português do Brasil para apoiar o casal (${p1Name} e ${p2Name}).
  
  Dados Atuais:
  - Estatísticas: ${coupleStats}
  - Tarefas pendentes: ${incompleteTasks || "Nenhuma! Incrível."}
  - Humores recentes: ${recentMoods || "Ainda sem check-ins hoje."}
  
  Importante:
  - Seja caloroso, romântico e apoiador.
  - Faça comentários que gerem união, reduzam o estresse Invisível da rotina, ou sugiram carinho mútuo.
  - Se os dois estiverem cansados, ative conselhos reconfortantes (modo acolhedor).
  - Use o nome de ambos ${p1Name} e ${p2Name} de forma carinhosa ou seus apelidos ("Mozão" e "Meu Amor").
  - Retorne um parágrafo conciso em formato de texto simples. Sem jargões técnicos.`;

  if (!client) {
    // Fallback if API key is not configured or mock
    const fallbackAnswers = [
      `${p1Name} e ${p2Name}, vocês estão indo muito bem nesta semana! Que tal prepararem uma das suas receitas favoritas hoje e relaxarem juntinhos no sofá? Um abraço forte cuida de qualquer cansaço. 💜`,
      `Percebi que a rotina está um pouco cheia hoje. Meu Amor ${p1Name} e Mozão ${p2Name}, lembrem-se de respirar fundo e dividir o peso das tarefas. Uma noite tranquila com fondue pode ser maravilhoso para vocês!`,
      `Parabéns pelo progresso no Nível do Lar! Cada pequena tarefa concluída é um carinho com o outro. Aproveitem a noite de hoje livre de louças para assistirem algo engraçado juntos.`
    ];
    return res.json({ insight: fallbackAnswers[Math.floor(Math.random() * fallbackAnswers.length)] });
  }

  client.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
  }).then(response => {
    res.json({ insight: response.text });
  }).catch(err => {
    console.error("Gemini Insight Call failed:", err);
    res.json({ 
      insight: `${p1Name} e ${p2Name}, lembrem-se de respirar fundo e dividir o peso das tarefas cotidianas. Vocês são uma ótima dupla! Que tal uma noite de cafuné e descanso? 💜` 
    });
  });
});


// ================= EDITING & DELETION ENDPOINTS =================

// Tasks
app.post("/api/tasks/update", (req, res) => {
  const { id, title, description, responsible_id, due_date, recurrence, category, priority, time_estimate } = req.body;
  const store = db.getStore();
  const task = store.tasks.find(t => t.id === id);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }
  if (title) task.title = title.slice(0, 80);
  if (description !== undefined) task.description = description.slice(0, 500);
  if (responsible_id) task.responsible_id = responsible_id;
  if (due_date !== undefined) task.due_date = due_date || undefined;
  if (recurrence) task.recurrence = recurrence;
  if (category) task.category = category;
  if (priority) {
    task.priority = priority;
    task.points = priority === TaskPriority.URGENTE ? 25 : 10;
  }
  if (time_estimate !== undefined) task.time_estimate = time_estimate ? parseInt(time_estimate, 10) : undefined;

  db.saveStore();
  res.json({ success: true, task });
});

app.post("/api/tasks/delete", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  const initialLen = store.tasks.length;
  store.tasks = store.tasks.filter(t => t.id !== id);
  db.saveStore();
  res.json({ success: true, count: initialLen - store.tasks.length });
});

// Events
app.post("/api/events/update", (req, res) => {
  const { id, title, description, type, start_time, end_time, location, booking_link, responsible_id } = req.body;
  const store = db.getStore();
  const event = store.events.find(e => e.id === id);
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }
  if (title) event.title = title;
  if (description !== undefined) event.description = description;
  if (type) event.type = type;
  if (start_time) event.start_time = start_time;
  if (end_time !== undefined) event.end_time = end_time || undefined;
  if (location !== undefined) event.location = location || undefined;
  if (booking_link !== undefined) event.booking_link = booking_link || undefined;
  if (responsible_id) event.responsible_id = responsible_id;

  db.saveStore();
  res.json({ success: true, event });
});

app.post("/api/events/delete", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  const initialLen = store.events.length;
  store.events = store.events.filter(e => e.id !== id);
  db.saveStore();
  res.json({ success: true, count: initialLen - store.events.length });
});

// Memories
app.post("/api/memories/update", (req, res) => {
  const { id, description, date, location, album_name, is_capsule, capsule_unlock_date } = req.body;
  const store = db.getStore();
  const memory = store.memories.find(m => m.id === id);
  if (!memory) {
    return res.status(404).json({ error: "Memory not found" });
  }
  if (description !== undefined) memory.description = description;
  if (date !== undefined) memory.date = date;
  if (location !== undefined) memory.location = location;
  if (album_name !== undefined) memory.album_name = album_name;
  if (is_capsule !== undefined) memory.is_capsule = !!is_capsule;
  if (capsule_unlock_date !== undefined) memory.capsule_unlock_date = capsule_unlock_date || undefined;

  db.saveStore();
  res.json({ success: true, memory });
});

app.post("/api/memories/delete", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  const initialLen = store.memories.length;
  store.memories = store.memories.filter(m => m.id !== id);
  db.saveStore();
  res.json({ success: true, count: initialLen - store.memories.length });
});

// Wishlist
app.post("/api/wishlist/update", (req, res) => {
  const { id, name, link, estimated_price, priority, is_private_to_partner, category, saving_goal, currency_type } = req.body;
  const store = db.getStore();
  const wishlist = store.wishlist.find(w => w.id === id);
  if (!wishlist) {
    return res.status(404).json({ error: "Wishlist item not found" });
  }
  if (name) wishlist.name = name;
  if (link !== undefined) wishlist.link = link;
  if (estimated_price !== undefined) wishlist.estimated_price = estimated_price ? parseFloat(estimated_price) : undefined;
  if (priority) wishlist.priority = priority;
  if (currency_type !== undefined) wishlist.currency_type = currency_type;
  if (is_private_to_partner !== undefined) wishlist.is_private_to_partner = !!is_private_to_partner;
  if (category) wishlist.category = category;
  if (saving_goal !== undefined) {
    wishlist.saving_goal = saving_goal ? parseFloat(saving_goal) : undefined;
    if (saving_goal && wishlist.saving_saved === undefined) {
      wishlist.saving_saved = 0;
    }
  }

  db.saveStore();
  res.json({ success: true, item: wishlist });
});

app.post("/api/wishlist/delete", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  const initialLen = store.wishlist.length;
  store.wishlist = store.wishlist.filter(w => w.id !== id);
  db.saveStore();
  res.json({ success: true, count: initialLen - store.wishlist.length });
});

// Recipes
app.post("/api/recipes/update", (req, res) => {
  const { id, title, ingredients, instructions, duration, portions, couple_rating, tags, photo_url } = req.body;
  const store = db.getStore();
  const recipe = store.recipes.find(r => r.id === id);
  if (!recipe) {
    return res.status(404).json({ error: "Recipe not found" });
  }
  if (title) recipe.title = title;
  if (ingredients !== undefined) recipe.ingredients = Array.isArray(ingredients) ? ingredients : [ingredients];
  if (instructions !== undefined) recipe.instructions = instructions;
  if (duration !== undefined) recipe.duration = duration ? parseInt(duration, 10) : 30;
  if (portions !== undefined) recipe.portions = portions ? parseInt(portions, 10) : 2;
  if (couple_rating !== undefined) recipe.couple_rating = couple_rating || undefined;
  if (tags !== undefined) recipe.tags = tags || [];
  if (photo_url !== undefined) recipe.photo_url = photo_url;

  db.saveStore();
  res.json({ success: true, recipe });
});

app.post("/api/recipes/delete", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  const initialLen = store.recipes.length;
  store.recipes = store.recipes.filter(r => r.id !== id);
  db.saveStore();
  res.json({ success: true, count: initialLen - store.recipes.length });
});


// ================= PET MODULE ENDPOINTS =================

app.post("/api/pets/create", (req, res) => {
  const { name, breed, age, avatar_url, food_daily_qty, food_inventory_item_id } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Pet name is required" });
  }

  const store = db.getStore();
  if (!store.pets) store.pets = [];

  const newPet: Pet = {
    id: "pet_" + Date.now(),
    name,
    breed: breed || "",
    age: age ? parseInt(age, 10) : undefined,
    avatar_url: avatar_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300",
    vaccines: [],
    medications: [],
    weights: [],
    documents: [],
    food_daily_qty: food_daily_qty ? parseInt(food_daily_qty, 10) : undefined,
    food_inventory_item_id: food_inventory_item_id || undefined
  };

  store.pets.push(newPet);
  logActivity(store, "pet_added", `Novo pet registrado no lar: ${name}! 🐾`);
  db.saveStore();
  res.json({ success: true, pet: newPet });
});

app.post("/api/pets/update", (req, res) => {
  const { id, name, breed, age, avatar_url, vaccines, medications, weights, documents, food_daily_qty, food_inventory_item_id } = req.body;
  const store = db.getStore();
  if (!store.pets) store.pets = [];
  
  const pet = store.pets.find(p => p.id === id);
  if (!pet) {
    return res.status(404).json({ error: "Pet not found" });
  }

  if (name) pet.name = name;
  if (breed !== undefined) pet.breed = breed;
  if (age !== undefined) pet.age = age ? parseInt(age, 10) : undefined;
  if (avatar_url !== undefined) pet.avatar_url = avatar_url;
  if (vaccines !== undefined) pet.vaccines = vaccines;
  if (medications !== undefined) pet.medications = medications;
  if (weights !== undefined) pet.weights = weights;
  if (documents !== undefined) pet.documents = documents;
  if (food_daily_qty !== undefined) pet.food_daily_qty = food_daily_qty ? parseInt(food_daily_qty, 10) : undefined;
  if (food_inventory_item_id !== undefined) pet.food_inventory_item_id = food_inventory_item_id;

  // Let's check food integration! "Controle de ração e alimentação: can deduct and triggers shopping if low"
  // If we update food and we have food_inventory_item_id, let's verify if the connected inventory item exists
  // and trigger checks if needed.
  if (pet.food_inventory_item_id) {
    const invItem = store.inventory.find(i => i.id === pet.food_inventory_item_id);
    if (invItem && invItem.quantity < invItem.min_quantity) {
      // already handled, or let's double trigger
      const today = new Date();
      const currentMonthId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      const lowercaseName = invItem.name.trim().toLowerCase();
      const exists = store.shopping.find(
        (s: any) => !s.is_bought && 
             (s.monthId === currentMonthId) && 
             s.name.trim().toLowerCase() === lowercaseName
      );
      if (!exists) {
        const newShopItem = {
          id: "shop_inv_" + Date.now(),
          name: invItem.name,
          category: ShoppingCategory.OUTROS,
          quantity: Math.max(1, Math.ceil(invItem.min_quantity - invItem.quantity)),
          unit: invItem.unit,
          price: 0,
          is_bought: false,
          added_by: "Fome do Pet (" + pet.name + ")",
          monthId: currentMonthId,
          coupleId: pet.coupleId
        };
        store.shopping.push(newShopItem as any);
        logActivity(store, "pet_food_low", `Ração de '${pet.name}' acabando (${invItem.quantity} ${invItem.unit}). Item adicionado às compras!`);
      }
    }
  }

  db.saveStore();
  res.json({ success: true, pet });
});

app.post("/api/pets/delete", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  if (!store.pets) store.pets = [];
  
  const pet = store.pets.find(p => p.id === id);
  if (pet) {
    store.pets = store.pets.filter(p => p.id !== id);
    logActivity(store, "pet_deleted", `Pet removido do lar: ${pet.name}`);
    db.saveStore();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Pet not found" });
  }
});


// ================= NEW GAMIFICATION & ADVANCED MODULE ENDPOINTS =================

// Configurar Itens da Roleta
app.post("/api/couple/setup-roulette", (req, res) => {
  const { user_id, coupleId, items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Formato inválido." });
  }

  const uniqueItems = Array.from(new Set(items));
  if (uniqueItems.length !== 6) {
    return res.status(400).json({ error: "Você deve selecionar exatamente 6 prêmios únicos." });
  }

  const store = db.getStore();
  const { users } = getCoupleAndUsers(store, coupleId || "couple_1");
  const user = users[user_id];
  
  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  user.roulette_items = uniqueItems;
  db.saveStore();
  res.json({ success: true, users });
});

// Roleta da Sorte
app.post("/api/couple/spin-roulette", (req, res) => {
  const { user_id, coupleId } = req.body;
  const store = db.getStore();
  const { couple, users } = getCoupleAndUsers(store, coupleId || "couple_1");
  
  const user = users[user_id];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if ((user.coins || 0) < 50) {
    return res.status(400).json({ error: "Moedas insuficientes. O botão só deve ser habilitado com ≥ 50 Coins! 🪙" });
  }

  if (!user.roulette_items || user.roulette_items.length !== 6) {
    return res.status(400).json({ error: "Configure sua roleta no perfil primeiro." });
  }
  
  user.coins -= 50;
  
  const filterByCouple = (items: any[]) => {
    if (!items) return [];
    return items.filter(item => (item.coupleId || "couple_1") === (coupleId || "couple_1"));
  };
  const coupleRewards = filterByCouple(store.rewards || []);
  
  const defaultRewards = [
    { id: "mr_1", title: "Massagem rápida 💆‍♂️", cost: 0, emoji: "💆‍♂️" },
    { id: "mr_2", title: "Abraço apertado 🤗", cost: 0, emoji: "🤗" },
    { id: "mr_3", title: "Café na cama ☕", cost: 0, emoji: "☕" },
    { id: "mr_4", title: "Comer pizza 🍕", cost: 0, emoji: "🍕" },
    { id: "mr_5", title: "Escolher o filme 🎬", cost: 0, emoji: "🎬" },
    { id: "mr_6", title: "Passeio surpresa 🗺️", cost: 0, emoji: "🗺️" }
  ];
  
  const combined = [...coupleRewards, ...defaultRewards];
  const poolMap = new Map();
  combined.forEach(r => {
    if (!poolMap.has(r.id)) poolMap.set(r.id, r);
  });
  const pool = Array.from(poolMap.values());

  // Pick one randomly from roulette_items
  const randomIndex = Math.floor(Math.random() * user.roulette_items.length);
  const rewardId = user.roulette_items[randomIndex];
  
  // Find full reward obj
  const selectedReward = pool.find(r => r.id === rewardId) || { id: "fallback", title: "Abraço Misterioso 🤗", cost: 0, emoji: "🤗" };
  
  if (!couple.unlocked_achievements) {
    couple.unlocked_achievements = [];
  }
  const timestamp = new Date().toISOString();
  couple.unlocked_achievements.push(`redeemed:${selectedReward.title} (Roleta da Sorte):${user_id}:${timestamp}`);
  
  logActivityForCouple(store, coupleId || "couple_1", "mystery_box", `🎰 ${user_id} girou a Roleta da Sorte e ganhou: '${selectedReward.title}'!`);
  
  db.saveStore();
  res.json({ success: true, reward: selectedReward, couple, users });
});

// Transfer task to partner (Passe Livre)
app.post("/api/tasks/transfer", (req, res) => {
  const { id, toUserId, fromUserId, note } = req.body;
  const store = db.getStore();
  const task = store.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  
  task.responsible_id = toUserId;
  if (!task.comments) task.comments = [];
  task.comments.push({
    id: "c_" + Date.now(),
    author_id: fromUserId,
    text: `Vale presente do parceiro: ${note || "Transferido por Passe Livre."}`,
    timestamp: new Date().toISOString()
  });
  
  const coupleId = task.coupleId || "couple_1";
  logActivityForCouple(store, coupleId, "task_transferred", `🔄 ${fromUserId} transferiu a tarefa '${task.title}' para ${toUserId}! (${note})`);
  
  db.saveStore();
  res.json({ success: true, task });
});

// Pause task / Folga da Minha Obrigação (Vale-Folga Extrema)
app.post("/api/tasks/pause", (req, res) => {
  const { id, mode, fromUserId, note } = req.body; // mode: "parceiro_assume" or "ninguem_faz"
  const store = db.getStore();
  const task = store.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  
  if (!task.comments) task.comments = [];
  const coupleId = task.coupleId || "couple_1";
  
  if (mode === "parceiro_assume") {
    const coupleUsersMap = store.couplesUsers ? store.couplesUsers[coupleId] : null;
    const partnerId = coupleUsersMap 
      ? Object.keys(coupleUsersMap).find(uId => uId !== fromUserId) || (fromUserId === "Leandro" ? "Kaisa" : "Leandro")
      : (fromUserId === "Leandro" ? "Kaisa" : "Leandro");
    task.responsible_id = partnerId;
    task.comments.push({
      id: "c_" + Date.now(),
      author_id: fromUserId,
      text: `Folga extrema! O parceiro assume hoje: ${note || ""}`,
      timestamp: new Date().toISOString()
    });
    logActivityForCouple(store, coupleId, "task_paused", `🏖️ ${fromUserId} usou Folga Extrema: '${task.title}' agora é do parceiro!`);
  } else {
    task.title = `[PLAY-FOLGA 🏖️] ${task.title}`;
    task.comments.push({
      id: "c_" + Date.now(),
      author_id: fromUserId,
      text: `Folga extrema! Ninguém faz hoje: ${note || ""}`,
      timestamp: new Date().toISOString()
    });
    logActivityForCouple(store, coupleId, "task_paused", `🏖️ ${fromUserId} usou Folga Extrema: Hoje ninguém faz '${task.title}'!`);
  }
  
  db.saveStore();
  res.json({ success: true, task });
});

// House documents, maintenances, contacts, bills list manager
app.post("/api/house/create", (req, res) => {
  const { type, data, coupleId } = req.body; // type: "document", "maintenance", "contact", "fixedBill"
  const store = db.getStore();
  
  const cId = coupleId || "couple_1";
  
  data.id = "house_" + Date.now() + "_" + Math.floor(Math.random() * 100);
  data.coupleId = cId;
  
  const dbKey = type === "document" ? "houseDocuments" 
              : type === "maintenance" ? "houseMaintenances" 
              : type === "contact" ? "houseContacts" 
              : "fixedBills";
              
  if (!store[dbKey]) store[dbKey] = [];
  store[dbKey].push(data);
  db.saveStore();
  res.json({ success: true, item: data });
});

app.post("/api/house/delete", (req, res) => {
  const { type, id } = req.body;
  const store = db.getStore();
  const dbKey = type === "document" ? "houseDocuments" 
              : type === "maintenance" ? "houseMaintenances" 
              : type === "contact" ? "houseContacts" 
              : "fixedBills";
              
  if (store[dbKey]) {
    store[dbKey] = store[dbKey].filter((i: any) => i.id !== id);
  }
  db.saveStore();
  res.json({ success: true });
});

app.post("/api/house/pay-bill", (req, res) => {
  const { id, paid_by_id, coupleId } = req.body;
  const store = db.getStore();
  const cId = coupleId || "couple_1";
  
  if (!store.fixedBills) store.fixedBills = [];
  const bill = store.fixedBills.find(b => b.id === id);
  if (bill) {
    bill.is_paid = true;
    bill.paid_by = paid_by_id;
    bill.paid_at = new Date().toISOString();
    
    // Register as an expense automatically as well!
    if (!store.expenses) store.expenses = [];
    const newExpense: any = {
      id: "exp_" + Date.now(),
      value: parseFloat(bill.value) || 0,
      currency: "R$",
      description: `Conta Fixa: ${bill.name}`,
      paid_by_id,
      split_type: "50/50",
      category: "Moradia",
      date: new Date().toISOString().split("T")[0],
      is_recurring: false,
      coupleId: cId,
      created_at: new Date().toISOString()
    };
    store.expenses.push(newExpense);
    
    logActivityForCouple(store, cId, "bill_paid", `💰 ${paid_by_id} registrou pagamento da conta '${bill.name}' de R$ ${bill.value}!`);
  }
  db.saveStore();
  res.json({ success: true });
});

app.post("/api/house/reset-bills", (req, res) => {
  const { coupleId } = req.body;
  const store = db.getStore();
  const cId = coupleId || "couple_1";
  if (store.fixedBills) {
    store.fixedBills.forEach((b: any) => {
      if ((b.coupleId || "couple_1") === cId) {
        b.is_paid = false;
        b.paid_by = undefined;
        b.paid_at = undefined;
      }
    });
  }
  db.saveStore();
  res.json({ success: true });
});

// Budget category updater
app.post("/api/couple/update-budgets", (req, res) => {
  const { budgets, coupleId } = req.body;
  const store = db.getStore();
  const { couple } = getCoupleAndUsers(store, coupleId || "couple_1");
  couple.category_budgets = budgets;
  db.saveStore();
  res.json({ success: true, couple });
});


// ================= SINTONIA DO CASAL (QUIZ / TRIVIA) =================

app.post("/api/quiz/answer", (req, res) => {
  const { question_id, question_text, self_answer, guess_partner_answer, options } = req.body;
  const { coupleId } = getRequestCredentials(req);
  const user_id = req.headers["x-user-id"] || req.body.userId || "Leandro";
  const store = db.getStore();
  const { users } = getCoupleAndUsers(store, coupleId || "couple_1");
  
  if (!store.quizzes) store.quizzes = [];
  
  let quiz = store.quizzes.find((q: any) => q.id === question_id);
  if (!quiz) {
    quiz = {
      id: question_id,
      text: question_text,
      options: options || [],
      answers: {},
      guesses: {},
      coupleId: coupleId || "couple_1",
      date: new Date().toISOString().split("T")[0]
    };
    store.quizzes.push(quiz);
  }
  
  quiz.answers[user_id as string] = self_answer;
  quiz.guesses[user_id as string] = guess_partner_answer;
  
  // Computar Recompensas
  const partnerId = Object.keys(users).find(k => k !== user_id);
  let message = "Respostas salvas! ";
  let rewardCoins = 0;

  if (partnerId && quiz.answers[partnerId]) {
    // Both ansewered
    const iGuessedRight = quiz.guesses[user_id as string] === quiz.answers[partnerId];
    if (iGuessedRight) {
      users[user_id as string].coins = (users[user_id as string].coins || 0) + 50;
      rewardCoins = 50;
      message += "Você acertou o gosto do mozão e ganhou +50 moedas! 🎉";
    } else {
      message += "Você errou o gosto do mozão! Mais sorte na próxima. 😅";
    }

    // Check if partner also got it right, retroactively (if they didn't get rewarded yet, wait no, they would have to load, but we can credit them now)
    const partnerGuessedRight = quiz.guesses[partnerId] === quiz.answers[user_id as string];
    if (partnerGuessedRight) {
       // Just making sure they receive it too.
       // It's easier if we flag who got the reward, but for simplicity, we can just grant it.
       // Actually, we'll only give the coin to the person who triggered. Wait, no. We can give to both.
       // If the partner answered first, they couldn't be checked until `user` answers `self_answer`.
       users[partnerId].coins = (users[partnerId].coins || 0) + 50;
    }
  } else {
    message += "Aguardando seu par responder para vermos se você acertou! ⏳";
  }

  db.saveStore();
  res.json({ success: true, quiz, users, message, rewardCoins });
});

// ================= 🔥 INTIMIDADE (SPICY) =================

app.post("/api/spicy/checkin", (req, res) => {
  const { user_id, level, note } = req.body;
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();
  const dateStr = new Date().toISOString().split("T")[0];
  
  if (!store.spicyCheckins) store.spicyCheckins = [];
  
  let checkin = store.spicyCheckins.find((m: any) => m.user_id === user_id && m.date === dateStr);
  if (checkin) {
    checkin.level = level;
    checkin.note = note || "";
  } else {
    checkin = { id: "spc_" + Date.now(), user_id, level, note: note || "", date: dateStr };
    store.spicyCheckins.push(checkin);
  }
  
  db.saveStore();
  res.json({ success: true, spicyCheckin: checkin });
});

app.post("/api/spicy/wishes/create", (req, res) => {
  const { user_id, text, is_anonymous } = req.body;
  const store = db.getStore();
  if (!store.secretWishes) store.secretWishes = [];
  
  const wish = {
    id: "wish_" + Date.now(),
    user_id,
    text,
    is_anonymous: !!is_anonymous,
    fulfilled: false,
    date: new Date().toISOString()
  };
  store.secretWishes.push(wish);
  db.saveStore();
  res.json({ success: true, wish });
});

app.post("/api/spicy/wishes/toggle", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  if (!store.secretWishes) store.secretWishes = [];
  const wish = store.secretWishes.find((w:any) => w.id === id);
  if (wish) {
    wish.fulfilled = !wish.fulfilled;
    db.saveStore();
  }
  res.json({ success: true, wish });
});

app.post("/api/spicy/wishes/delete", (req, res) => {
  const { id } = req.body;
  const store = db.getStore();
  if (!store.secretWishes) store.secretWishes = [];
  store.secretWishes = store.secretWishes.filter((w:any) => w.id !== id);
  db.saveStore();
  res.json({ success: true, message: "Desejo excluído." });
});

app.post("/api/spicy/buy-reward", (req, res) => {
  const { user_id, title, cost } = req.body;
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();
  const { users } = getCoupleAndUsers(store, coupleId || "couple_1");
  
  if (!users[user_id]) return res.status(404).json({ error: "User not found" });
  
  if (users[user_id].coins < cost) {
    return res.status(400).json({ error: "Moedas insuficientes!" });
  }

  // Deduct coins
  users[user_id].coins -= cost;

  // We add it to 'spicyWishes' as a fulfilled thing, or just to memory.
  if (!store.secretWishes) store.secretWishes = [];
  store.secretWishes.push({
    id: "wish_" + Date.now(),
    user_id,
    text: `[COMPRADO NA LOJA PIMENTA] ${title}`,
    is_anonymous: false,
    fulfilled: false, // leave false so they can fulfill it later when they demand it
    date: new Date().toISOString()
  });

  db.saveStore();
  res.json({ success: true, message: `Você adquiriu "${title}" com sucesso! O(A) parceiro(a) foi notificado e adicionado na sua Caixa de Desejos.`, users });
});

// ==========================================
// INTIMACY MODULE (SPICY MODE) ENDPOINTS
// ==========================================

// ========== MERCADO NEGRO (SPICY REWARDS) ==========

// Get all spicy rewards for couple
app.get("/api/spicy-rewards", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();
  const rewards = (store.spicyRewards || []).filter((r: any) => r.coupleId === coupleId && r.is_active);
  res.json({ rewards });
});

// Create custom spicy reward
app.post("/api/spicy-rewards/create", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const store = db.getStore();
  const { title, description, cost, emoji } = req.body;

  if (!store.spicyRewards) store.spicyRewards = [];

  const newReward = {
    id: "spicy_" + Date.now(),
    title,
    description: description || "",
    cost: parseInt(cost) || 100,
    emoji: emoji || "🌶️",
    is_repeatable: true,
    created_by: userId,
    coupleId,
    created_at: new Date().toISOString(),
    is_active: true
  };

  store.spicyRewards.push(newReward);
  db.saveStore();

  res.json({ success: true, reward: newReward });
});

// Update spicy reward
app.post("/api/spicy-rewards/update", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id, title, description, cost, emoji, is_active } = req.body;
  const store = db.getStore();

  const reward = (store.spicyRewards || []).find((r: any) => r.id === id && r.coupleId === coupleId);
  if (!reward) {
    return res.status(404).json({ error: "Recompensa não encontrada" });
  }

  if (title !== undefined) reward.title = title;
  if (description !== undefined) reward.description = description;
  if (cost !== undefined) reward.cost = parseInt(cost);
  if (emoji !== undefined) reward.emoji = emoji;
  if (is_active !== undefined) reward.is_active = is_active;

  db.saveStore();
  res.json({ success: true, reward });
});

// Delete spicy reward
app.post("/api/spicy-rewards/delete", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id } = req.body;
  const store = db.getStore();

  store.spicyRewards = (store.spicyRewards || []).filter((r: any) => !(r.id === id && r.coupleId === coupleId));
  db.saveStore();

  res.json({ success: true, message: "Recompensa removida do Mercado Negro" });
});

// Redeem spicy reward
app.post("/api/spicy-rewards/redeem", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const { rewardId } = req.body;
  const store = db.getStore();
  const { users, couple } = getCoupleAndUsers(store, coupleId || "couple_1");

  const reward = (store.spicyRewards || []).find((r: any) => r.id === rewardId && r.coupleId === coupleId);
  if (!reward) {
    return res.status(404).json({ error: "Recompensa não encontrada" });
  }

  if ((users[userId]?.coins || 0) < reward.cost) {
    return res.status(400).json({ error: "Moedas insuficientes para resgatar esta recompensa!" });
  }

  // Deduct coins
  users[userId].coins -= reward.cost;

  logActivityForCouple(store, coupleId, "spicy_reward_redeemed", `🌶️ ${userId} resgatou "${reward.title}" do Mercado Negro!`);

  db.saveStore();
  res.json({
    success: true,
    message: `Você resgatou "${reward.title}"! Mostre isso ao seu parceiro(a).`,
    reward,
    users
  });
});

// ========== MISSÕES +18 (SPICY QUESTS) ==========

// Get spicy quests
app.get("/api/spicy-quests", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();
  const quests = (store.spicyQuests || []).filter((q: any) => q.coupleId === coupleId && q.is_active);
  res.json({ quests });
});

// Create custom spicy quest
app.post("/api/spicy-quests/create", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const store = db.getStore();
  const { title, description, bonus_xp, bonus_coins } = req.body;

  if (!store.spicyQuests) store.spicyQuests = [];

  const newQuest = {
    id: "sq_" + Date.now(),
    title,
    description: description || "",
    bonus_xp: parseInt(bonus_xp) || 100,
    bonus_coins: parseInt(bonus_coins) || 200,
    created_by: userId,
    coupleId,
    created_at: new Date().toISOString(),
    is_active: true,
    is_featured: false
  };

  store.spicyQuests.push(newQuest);
  db.saveStore();

  res.json({ success: true, quest: newQuest });
});

// Update spicy quest
app.post("/api/spicy-quests/update", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id, title, description, bonus_xp, bonus_coins, is_active, is_featured } = req.body;
  const store = db.getStore();

  const quest = (store.spicyQuests || []).find((q: any) => q.id === id && q.coupleId === coupleId);
  if (!quest) {
    return res.status(404).json({ error: "Missão não encontrada" });
  }

  if (title !== undefined) quest.title = title;
  if (description !== undefined) quest.description = description;
  if (bonus_xp !== undefined) quest.bonus_xp = parseInt(bonus_xp);
  if (bonus_coins !== undefined) quest.bonus_coins = parseInt(bonus_coins);
  if (is_active !== undefined) quest.is_active = is_active;
  if (is_featured !== undefined) quest.is_featured = is_featured;

  db.saveStore();
  res.json({ success: true, quest });
});

// Delete spicy quest
app.post("/api/spicy-quests/delete", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id } = req.body;
  const store = db.getStore();

  store.spicyQuests = (store.spicyQuests || []).filter((q: any) => !(q.id === id && q.coupleId === coupleId));
  db.saveStore();

  res.json({ success: true, message: "Missão especial removida" });
});

// Complete spicy quest (award bonus)
app.post("/api/spicy-quests/complete", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const { questId } = req.body;
  const store = db.getStore();
  const { users, couple } = getCoupleAndUsers(store, coupleId || "couple_1");

  const quest = (store.spicyQuests || []).find((q: any) => q.id === questId && q.coupleId === coupleId);
  if (!quest) {
    return res.status(404).json({ error: "Missão não encontrada" });
  }

  // Check if already completed this week
  const weekDate = getISOWeek(new Date());
  const existing = (store.spicyQuestCompletions || []).find(
    (c: any) => c.quest_id === questId && c.user_id === userId && c.week_date === weekDate
  );

  if (existing) {
    return res.status(400).json({ error: "Você já completou esta missão nesta semana!" });
  }

  // Award bonuses
  if (users[userId]) {
    users[userId].coins = (users[userId].coins || 0) + quest.bonus_coins;
    users[userId].points_weekly = (users[userId].points_weekly || 0) + quest.bonus_xp;
  }

  // Record completion
  if (!store.spicyQuestCompletions) store.spicyQuestCompletions = [];
  store.spicyQuestCompletions.push({
    id: "sqc_" + Date.now(),
    quest_id: questId,
    user_id: userId,
    coupleId,
    completed_at: new Date().toISOString(),
    week_date: weekDate,
    bonus_awarded: true
  });

  logActivityForCouple(store, coupleId, "spicy_quest_completed", `🔥 ${userId} completou a missão "${quest.title}"! (+${quest.bonus_xp} XP, +${quest.bonus_coins} moedas)`);

  db.saveStore();
  res.json({
    success: true,
    message: `Missão completada! Você ganhou ${quest.bonus_xp} XP e ${quest.bonus_coins} moedas!`,
    quest,
    users
  });
});

// Helper function to get ISO week
function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${week.toString().padStart(2, '0')}`;
}

// ========== DADOS DO AMOR (LOVE DICE) ==========

// Get dice configurations
app.get("/api/love-dice/config", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();

  const actions = (store.loveDiceActions || []).filter((a: any) => a.coupleId === coupleId && a.is_active).sort((a: any, b: any) => a.order - b.order);
  const locations = (store.loveDiceLocations || []).filter((l: any) => l.coupleId === coupleId && l.is_active).sort((a: any, b: any) => a.order - b.order);

  res.json({ actions, locations });
});

// Create dice action
app.post("/api/love-dice/actions/create", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const store = db.getStore();
  const { text, order } = req.body;

  if (!store.loveDiceActions) store.loveDiceActions = [];

  const newAction = {
    id: "da_" + Date.now(),
    text,
    created_by: userId,
    coupleId,
    is_active: true,
    order: order || (store.loveDiceActions.filter((a: any) => a.coupleId === coupleId).length + 1)
  };

  store.loveDiceActions.push(newAction);
  db.saveStore();

  res.json({ success: true, action: newAction });
});

// Update dice action
app.post("/api/love-dice/actions/update", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id, text, is_active, order } = req.body;
  const store = db.getStore();

  const action = (store.loveDiceActions || []).find((a: any) => a.id === id && a.coupleId === coupleId);
  if (!action) {
    return res.status(404).json({ error: "Ação não encontrada" });
  }

  if (text !== undefined) action.text = text;
  if (is_active !== undefined) action.is_active = is_active;
  if (order !== undefined) action.order = order;

  db.saveStore();
  res.json({ success: true, action });
});

// Delete dice action
app.post("/api/love-dice/actions/delete", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id } = req.body;
  const store = db.getStore();

  store.loveDiceActions = (store.loveDiceActions || []).filter((a: any) => !(a.id === id && a.coupleId === coupleId));
  db.saveStore();

  res.json({ success: true });
});

// Create dice location
app.post("/api/love-dice/locations/create", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const store = db.getStore();
  const { text, order } = req.body;

  if (!store.loveDiceLocations) store.loveDiceLocations = [];

  const newLocation = {
    id: "dl_" + Date.now(),
    text,
    created_by: userId,
    coupleId,
    is_active: true,
    order: order || (store.loveDiceLocations.filter((l: any) => l.coupleId === coupleId).length + 1)
  };

  store.loveDiceLocations.push(newLocation);
  db.saveStore();

  res.json({ success: true, location: newLocation });
});

// Update dice location
app.post("/api/love-dice/locations/update", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id, text, is_active, order } = req.body;
  const store = db.getStore();

  const location = (store.loveDiceLocations || []).find((l: any) => l.id === id && l.coupleId === coupleId);
  if (!location) {
    return res.status(404).json({ error: "Local não encontrado" });
  }

  if (text !== undefined) location.text = text;
  if (is_active !== undefined) location.is_active = is_active;
  if (order !== undefined) location.order = order;

  db.saveStore();
  res.json({ success: true, location });
});

// Delete dice location
app.post("/api/love-dice/locations/delete", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id } = req.body;
  const store = db.getStore();

  store.loveDiceLocations = (store.loveDiceLocations || []).filter((l: any) => !(l.id === id && l.coupleId === coupleId));
  db.saveStore();

  res.json({ success: true });
});

// Roll the love dice
app.post("/api/love-dice/roll", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const { coin_cost } = req.body;
  const store = db.getStore();
  const { users } = getCoupleAndUsers(store, coupleId || "couple_1");

  const actions = (store.loveDiceActions || []).filter((a: any) => a.coupleId === coupleId && a.is_active);
  const locations = (store.loveDiceLocations || []).filter((l: any) => l.coupleId === coupleId && l.is_active);

  if (actions.length === 0 || locations.length === 0) {
    return res.status(400).json({ error: "Configure ações e locais antes de rolar os dados!" });
  }

  const cost = coin_cost || 0;

  // Check if user has enough coins
  if (cost > 0 && (users[userId]?.coins || 0) < cost) {
    return res.status(400).json({ error: "Moedas insuficientes para rolar os dados!" });
  }

  // Deduct coins if needed
  if (cost > 0 && users[userId]) {
    users[userId].coins -= cost;
  }

  // Random selection
  const randomAction = actions[Math.floor(Math.random() * actions.length)];
  const randomLocation = locations[Math.floor(Math.random() * locations.length)];

  // Record roll
  if (!store.loveDiceRolls) store.loveDiceRolls = [];
  const roll = {
    id: "roll_" + Date.now(),
    action_id: randomAction.id,
    location_id: randomLocation.id,
    rolled_by: userId,
    coupleId,
    rolled_at: new Date().toISOString(),
    coin_cost: cost
  };
  store.loveDiceRolls.push(roll);

  db.saveStore();
  res.json({
    success: true,
    result: {
      action: randomAction.text,
      location: randomLocation.text,
      full_text: `${randomAction.text} ${randomLocation.text}`
    },
    coin_cost: cost,
    users
  });
});

// ========== COFRE DE FANTASIAS (SECRET FANTASY MATCH) ==========

// Get available fantasies
app.get("/api/fantasies", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();

  // Get system fantasies + couple's custom fantasies
  const systemFantasies = (store.secretFantasies || []).filter((f: any) => !f.coupleId || f.coupleId === coupleId);
  res.json({ fantasies: systemFantasies });
});

// Create custom fantasy
app.post("/api/fantasies/create", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const store = db.getStore();
  const { title, description, category } = req.body;

  if (!store.secretFantasies) store.secretFantasies = [];

  const newFantasy = {
    id: "sf_" + Date.now(),
    title,
    description: description || "",
    category: category || "Outro",
    added_by: userId,
    is_custom: true,
    coupleId,
    is_active: true
  };

  store.secretFantasies.push(newFantasy);
  db.saveStore();

  res.json({ success: true, fantasy: newFantasy });
});

// Delete custom fantasy
app.post("/api/fantasies/delete", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id } = req.body;
  const store = db.getStore();

  store.secretFantasies = (store.secretFantasies || []).filter(
    (f: any) => !(f.id === id && f.is_custom && f.coupleId === coupleId)
  );
  db.saveStore();

  res.json({ success: true });
});

// Select a fantasy (for matching)
app.post("/api/fantasies/select", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const { fantasyId } = req.body;
  const store = db.getStore();

  if (!store.userFantasySelections) store.userFantasySelections = [];

  // Check if already selected this fantasy
  const existing = store.userFantasySelections.find(
    (s: any) => s.fantasy_id === fantasyId && s.user_id === userId && s.coupleId === coupleId
  );

  if (existing) {
    return res.status(400).json({ error: "Você já selecionou esta fantasia!" });
  }

  const selection = {
    id: "ufs_" + Date.now(),
    fantasy_id: fantasyId,
    user_id: userId,
    coupleId,
    selected_at: new Date().toISOString(),
    is_matched: false,
    is_revealed: false
  };

  store.userFantasySelections.push(selection);

  // Check for match - if partner also selected the same fantasy
  const partnerSelections = store.userFantasySelections.filter(
    (s: any) => s.fantasy_id === fantasyId && s.coupleId === coupleId && s.user_id !== userId
  );

  if (partnerSelections.length > 0) {
    // It's a match!
    selection.is_matched = true;
    selection.matched_at = new Date().toISOString();
    partnerSelections.forEach((ps: any) => {
      ps.is_matched = true;
      ps.matched_at = new Date().toISOString();
    });

    const fantasy = store.secretFantasies.find((f: any) => f.id === fantasyId);
    logActivityForCouple(store, coupleId, "fantasy_match", `💕 MATCH! Vocês combinaram: "${fantasy?.title}"`);

    db.saveStore();
    return res.json({
      success: true,
      matched: true,
      message: "MATCH! Vocês selecionaram a mesma fantasia!",
      fantasy
    });
  }

  db.saveStore();
  res.json({ success: true, matched: false, message: "Fantasia registrada. Aguardando parceiro(a)..." });
});

// Get user's fantasy selections
app.get("/api/fantasies/my-selections", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const store = db.getStore();

  const selections = (store.userFantasySelections || [])
    .filter((s: any) => s.user_id === userId && s.coupleId === coupleId)
    .map((s: any) => {
      const fantasy = store.secretFantasies?.find((f: any) => f.id === s.fantasy_id);
      return { ...s, fantasy };
    });

  const matched = selections.filter((s: any) => s.is_matched && !s.is_revealed);

  res.json({ selections, matchedCount: matched.length });
});

// Reveal matched fantasy
app.post("/api/fantasies/reveal", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { selectionId } = req.body;
  const store = db.getStore();

  const selection = (store.userFantasySelections || []).find(
    (s: any) => s.id === selectionId && s.coupleId === coupleId && s.is_matched
  );

  if (!selection) {
    return res.status(404).json({ error: "Seleção não encontrada ou não combinada" });
  }

  selection.is_revealed = true;

  // Reveal partner's selection too
  const partnerSelection = store.userFantasySelections.find(
    (s: any) => s.fantasy_id === selection.fantasy_id && s.coupleId === coupleId && s.user_id !== selection.user_id
  );
  if (partnerSelection) {
    partnerSelection.is_revealed = true;
  }

  const fantasy = store.secretFantasies?.find((f: any) => f.id === selection.fantasy_id);

  db.saveStore();
  res.json({ success: true, fantasy, revealed: true });
});

// ========== TRACKER DE INTIMIDADE ==========

// Get intimacy check-ins
app.get("/api/intimacy/checkins", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();

  const checkins = (store.intimacyCheckins || []).filter((c: any) => c.coupleId === coupleId);
  res.json({ checkins });
});

// Create intimacy check-in
app.post("/api/intimacy/checkins/create", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const { date, type, notes, mood_rating, linked_task_completion } = req.body;
  const store = db.getStore();

  if (!store.intimacyCheckins) store.intimacyCheckins = [];

  const checkin = {
    id: "ic_" + Date.now(),
    date: date || new Date().toISOString().split('T')[0],
    user_id: userId,
    coupleId,
    type: type || "quality_time",
    notes,
    mood_rating,
    linked_task_completion,
    created_at: new Date().toISOString()
  };

  store.intimacyCheckins.push(checkin);

  // Generate insights periodically
  generateIntimacyInsights(store, coupleId);

  db.saveStore();
  res.json({ success: true, checkin });
});

// Delete intimacy check-in
app.post("/api/intimacy/checkins/delete", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id } = req.body;
  const store = db.getStore();

  store.intimacyCheckins = (store.intimacyCheckins || []).filter(
    (c: any) => !(c.id === id && c.coupleId === coupleId)
  );
  db.saveStore();

  res.json({ success: true });
});

// Get intimacy insights
app.get("/api/intimacy/insights", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();

  const insights = (store.intimacyInsights || []).filter((i: any) => i.coupleId === coupleId);
  res.json({ insights });
});

// Helper: Generate intimacy insights based on check-ins and task completion
function generateIntimacyInsights(store: any, coupleId: string) {
  if (!store.intimacyInsights) store.intimacyInsights = [];

  const checkins = (store.intimacyCheckins || []).filter((c: any) => c.coupleId === coupleId);
  const tasks = (store.tasks || []).filter((t: any) => t.coupleId === coupleId);

  // Insight 1: Frequency correlation with completed tasks
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentCheckins = checkins.filter((c: any) => new Date(c.date) >= last30Days);
  const recentTasks = tasks.filter((t: any) => new Date(t.completed_at || 0) >= last30Days && t.completed);

  if (recentCheckins.length >= 3 && recentTasks.length >= 10) {
    const checkinsDays = recentCheckins.map((c: any) => c.date);
    const tasksCompletedDays = recentTasks.map((t: any) => t.completed_at?.split('T')[0]);

    // Count days with both check-in and completed tasks
    const correlatedDays = checkinsDays.filter((day: string) =>
      tasksCompletedDays.some((tDay: string) => tDay === day)
    ).length;

    if (correlatedDays >= 2) {
      const insight = {
        id: "insight_" + Date.now(),
        coupleId,
        insight_text: `📊 Vocês tiveram ${correlatedDays} dias de qualidade juntos quando as tarefas domésticas estavam em dia! A frequência de vocês aumenta quando a louça não está na pia!`,
        insight_type: "correlation",
        generated_at: new Date().toISOString(),
        is_read: false
      };

      // Avoid duplicate insights
      if (!store.intimacyInsights.some((i: any) => i.insight_text === insight.insight_text)) {
        store.intimacyInsights.push(insight);
      }
    }
  }
}

// ==========================================
// ENTERTAINMENT MODULE ENDPOINTS
// ==========================================

// ========== ENCONTRO GACHA (DATE ROULETTE) ==========

// Get date options
app.get("/api/date-options", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();

  const options = (store.dateOptions || []).filter((o: any) => o.coupleId === coupleId && o.is_active);
  res.json({ options });
});

// Create date option
app.post("/api/date-options/create", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const store = db.getStore();
  const { title, description, category, estimated_cost, emoji } = req.body;

  if (!store.dateOptions) store.dateOptions = [];

  const newOption = {
    id: "do_" + Date.now(),
    title,
    description: description || "",
    category: category || "outro",
    estimated_cost: estimated_cost ? parseFloat(estimated_cost) : undefined,
    emoji: emoji || "💖",
    created_by: userId,
    coupleId,
    is_active: true,
    times_chosen: 0
  };

  store.dateOptions.push(newOption);
  db.saveStore();

  res.json({ success: true, option: newOption });
});

// Update date option
app.post("/api/date-options/update", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id, title, description, category, estimated_cost, emoji, is_active } = req.body;
  const store = db.getStore();

  const option = (store.dateOptions || []).find((o: any) => o.id === id && o.coupleId === coupleId);
  if (!option) {
    return res.status(404).json({ error: "Opção não encontrada" });
  }

  if (title !== undefined) option.title = title;
  if (description !== undefined) option.description = description;
  if (category !== undefined) option.category = category;
  if (estimated_cost !== undefined) option.estimated_cost = parseFloat(estimated_cost);
  if (emoji !== undefined) option.emoji = emoji;
  if (is_active !== undefined) option.is_active = is_active;

  db.saveStore();
  res.json({ success: true, option });
});

// Delete date option
app.post("/api/date-options/delete", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id } = req.body;
  const store = db.getStore();

  store.dateOptions = (store.dateOptions || []).filter((o: any) => !(o.id === id && o.coupleId === coupleId));
  db.saveStore();

  res.json({ success: true });
});

// Roll date gacha
app.post("/api/date-options/roll", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const store = db.getStore();

  const options = (store.dateOptions || []).filter((o: any) => o.coupleId === coupleId && o.is_active);

  if (options.length === 0) {
    return res.status(400).json({ error: "Nenhuma opção de encontro cadastrada!" });
  }

  // Random selection
  const selectedOption = options[Math.floor(Math.random() * options.length)];

  // Update times chosen
  selectedOption.times_chosen = (selectedOption.times_chosen || 0) + 1;

  // Record roll
  if (!store.dateGachaRolls) store.dateGachaRolls = [];
  const roll = {
    id: "dgr_" + Date.now(),
    date_option_id: selectedOption.id,
    rolled_by: userId,
    coupleId,
    rolled_at: new Date().toISOString(),
    is_accepted: false
  };
  store.dateGachaRolls.push(roll);

  db.saveStore();
  res.json({
    success: true,
    result: selectedOption,
    rollId: roll.id
  });
});

// Accept/reroll date gacha
app.post("/api/date-options/accept", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { rollId, is_accepted, scheduled_date } = req.body;
  const store = db.getStore();

  const roll = (store.dateGachaRolls || []).find((r: any) => r.id === rollId && r.coupleId === coupleId);
  if (!roll) {
    return res.status(404).json({ error: "Rolagem não encontrada" });
  }

  roll.is_accepted = is_accepted;
  if (scheduled_date) {
    roll.scheduled_date = scheduled_date;
  }

  db.saveStore();
  res.json({ success: true, roll });
});

// ========== WATCHLIST DO CASAL ==========

// Get watchlist
app.get("/api/watchlist", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();

  const items = (store.watchlistItems || []).filter((w: any) => w.coupleId === coupleId);
  res.json({ watchlist: items });
});

// Create watchlist item
app.post("/api/watchlist/create", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const store = db.getStore();
  const { title, type, platform, genre, total_episodes, poster_url, notes } = req.body;

  if (!store.watchlistItems) store.watchlistItems = [];

  // Determine whose turn next (default to partner of suggester)
  const nextPicker = userId === "Leandro" ? "Kaisa" : "Leandro";

  const newItem = {
    id: "wl_" + Date.now(),
    title,
    type: type || "filme",
    platform,
    genre,
    suggested_by: userId,
    coupleId,
    status: "quero_ver",
    current_episode: 0,
    total_episodes: total_episodes ? parseInt(total_episodes) : undefined,
    rating: undefined,
    notes,
    added_at: new Date().toISOString(),
    whose_turn: nextPicker,
    poster_url
  };

  store.watchlistItems.push(newItem);
  db.saveStore();

  res.json({ success: true, item: newItem });
});

// Update watchlist item
app.post("/api/watchlist/update", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id, status, current_episode, rating, notes } = req.body;
  const store = db.getStore();

  const item = (store.watchlistItems || []).find((w: any) => w.id === id && w.coupleId === coupleId);
  if (!item) {
    return res.status(404).json({ error: "Item não encontrado" });
  }

  if (status !== undefined) item.status = status;
  if (current_episode !== undefined) item.current_episode = parseInt(current_episode);
  if (rating !== undefined) item.rating = parseInt(rating);
  if (notes !== undefined) item.notes = notes;

  // If completed, set finished_at
  if (status === "assistido") {
    item.finished_at = new Date().toISOString();
  }

  db.saveStore();
  res.json({ success: true, item });
});

// Delete watchlist item
app.post("/api/watchlist/delete", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { id } = req.body;
  const store = db.getStore();

  store.watchlistItems = (store.watchlistItems || []).filter((w: any) => !(w.id === id && w.coupleId === coupleId));
  db.saveStore();

  res.json({ success: true });
});

// Mark episode as watched
app.post("/api/watchlist/watch-episode", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const { itemId } = req.body;
  const store = db.getStore();

  const item = (store.watchlistItems || []).find((w: any) => w.id === itemId && w.coupleId === coupleId);
  if (!item) {
    return res.status(404).json({ error: "Item não encontrado" });
  }

  // Increment episode
  item.current_episode = (item.current_episode || 0) + 1;

  // If all episodes watched, mark as completed
  if (item.total_episodes && item.current_episode >= item.total_episodes) {
    item.status = "assistido";
    item.finished_at = new Date().toISOString();
  }

  // Record watch history
  if (!store.watchHistory) store.watchHistory = [];
  store.watchHistory.push({
    id: "wh_" + Date.now(),
    watchlist_item_id: itemId,
    watched_at: new Date().toISOString(),
    watched_by: userId,
    coupleId
  });

  // Toggle whose turn to pick next
  item.whose_turn = userId === "Leandro" ? "Kaisa" : "Leandro";

  db.saveStore();
  res.json({ success: true, item });
});

// Suggest random movie
app.get("/api/watchlist/suggest-random", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const store = db.getStore();

  // Get items from "quero_ver" and whose turn matches the requester
  const items = (store.watchlistItems || []).filter(
    (w: any) => w.coupleId === coupleId && w.status === "quero_ver"
  );

  if (items.length === 0) {
    return res.json({ suggestion: null, message: "Nenhum item disponível na watchlist" });
  }

  // Prefer items suggested by whose_turn user
  const whoseTurnItems = items.filter((w: any) => w.whose_turn === req.headers["x-user-id"]);

  const pool = whoseTurnItems.length > 0 ? whoseTurnItems : items;
  const suggestion = pool[Math.floor(Math.random() * pool.length)];

  res.json({ suggestion });
});

// ========== WISHLIST FINANCIAL INTEGRATION ==========

// Add deposit to wishlist item
app.post("/api/wishlist/deposit", (req, res) => {
  const { coupleId, userId } = getRequestCredentials(req);
  const { wishlistItemId, amount, notes } = req.body;
  const store = db.getStore();
  const { users } = getCoupleAndUsers(store, coupleId || "couple_1");

  const item = (store.wishlist || []).find((w: any) => w.id === wishlistItemId && w.coupleId === coupleId);
  if (!item) {
    return res.status(404).json({ error: "Item da wishlist não encontrado" });
  }

  const depositAmount = parseFloat(amount);
  if (isNaN(depositAmount) || depositAmount <= 0) {
    return res.status(400).json({ error: "Valor de depósito inválido" });
  }

  // Update wishlist item savings
  item.saving_saved = (item.saving_saved || 0) + depositAmount;

  // Record deposit
  if (!store.wishlistDeposits) store.wishlistDeposits = [];
  const deposit = {
    id: "dep_" + Date.now(),
    wishlist_item_id: wishlistItemId,
    user_id: userId,
    coupleId,
    amount: depositAmount,
    deposited_at: new Date().toISOString(),
    coin_bonus_awarded: false,
    notes
  };
  store.wishlistDeposits.push(deposit);

  // Award +10 coins to depositor
  if (users[userId]) {
    users[userId].coins = (users[userId].coins || 0) + 10;
    deposit.coin_bonus_awarded = true;
  }

  logActivityForCouple(store, coupleId, "wishlist_deposit", `💰 ${userId} depositou R$ ${depositAmount.toFixed(2)} para "${item.name}" (+10 moedas!)`);

  db.saveStore();
  res.json({
    success: true,
    deposit,
    item,
    bonusAwarded: 10,
    users
  });
});

// Get deposits for wishlist item
app.get("/api/wishlist/deposits", (req, res) => {
  const { coupleId } = getRequestCredentials(req);
  const { itemId } = req.query;
  const store = db.getStore();

  const deposits = (store.wishlistDeposits || [])
    .filter((d: any) => d.coupleId === coupleId && (!itemId || d.wishlist_item_id === itemId))
    .sort((a: any, b: any) => new Date(b.deposited_at).getTime() - new Date(a.deposited_at).getTime());

  res.json({ deposits });
});

// ==========================================
// VITE SETUP / STATIC DELIVERY SYSTEM
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting backend dev server and injecting Vite client-side SPA bundle...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static build
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NósDois Server running successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer();
