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

// ==========================================
// DEFAULT SEED DATA (mantido igual ao original)
// ==========================================

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
    comments: [
      { id: "c1", author_id: "Kaisa", text: "Amor, não se esquece de colocar o escorredor no lugar 💜", timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: "c2", author_id: "Leandro", text: "Pode deixar, vou fazer isso já já!", timestamp: new Date(Date.now() - 1800000).toISOString() }
    ]
  },
  {
    id: "task_2",
    title: "Dar banho no Luke (Pet)",
    description: "Dar banho, secar bem com toalha e aplicar o spray de cheiro agradável.",
    responsible_id: "Kaisa",
    category: TaskCategory.PET,
    priority: TaskPriority.URGENTE,
    due_date: new Date().toISOString().split("T")[0],
    recurrence: "Semanal",
    time_estimate: 45,
    points: 25,
    completed: true,
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    archived: false,
    comments: [
      { id: "c3", author_id: "Kaisa", text: "Ficou muito cheiroso!", timestamp: new Date(Date.now() - 80000000).toISOString() }
    ]
  },
  {
    id: "task_3",
    title: "Passar pano na sala e quarto",
    description: "Varrer primeiro, depois passar pano úmido com desinfetante lavanda.",
    responsible_id: "Ambos",
    category: TaskCategory.SALA,
    priority: TaskPriority.NORMAL,
    due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    recurrence: "Semanal",
    time_estimate: 30,
    points: 15,
    completed: false,
    archived: false,
    comments: []
  },
  {
    id: "task_4",
    title: "Trocar lâmpada do banheiro social",
    description: "Comprar lâmpada LED branca de rosca comum e instalar.",
    responsible_id: "Leandro",
    category: TaskCategory.BANHEIRO,
    priority: TaskPriority.BAIXA,
    due_date: new Date(Date.now() + 259200000).toISOString().split("T")[0],
    recurrence: "Nenhuma",
    time_estimate: 10,
    points: 10,
    completed: false,
    archived: false,
    comments: []
  }
];

const DEFAULT_EVENTS: Event[] = [
  {
    id: "event_1",
    title: "Aniversário de Casamento (Celebração)",
    description: "Nosso dia especial! Jantar romântico reservado no restaurante Vista Rooftop.",
    type: EventType.DATA_ESPECIAL,
    start_time: `${new Date().getFullYear()}-06-12T20:00:00`,
    end_time: `${new Date().getFullYear()}-06-12T23:30:00`,
    location: "Restaurante Vista Rooftop",
    booking_link: "https://example.com/reserva-vista",
    responsible_id: "Ambos",
    comments: []
  },
  {
    id: "event_2",
    title: "Viagem de Fim de Semana para Campos do Jordão",
    description: "Mini-férias no frio! Cobertores, fondue e caminhadas ao ar livre.",
    type: EventType.VIAGEM,
    start_time: `${new Date().getFullYear()}-07-15T08:00:00`,
    end_time: `${new Date().getFullYear()}-07-17T18:00:00`,
    location: "Chale Bosque Feliz, Campos do Jordão",
    travel_checklist: [
      { item: "Casacos pesados", checked: true },
      { item: "Estojo de remédios", checked: false },
      { item: "Garrafa térmica de café", checked: true },
      { item: "Carregadores e câmera", checked: false }
    ],
    responsible_id: "Ambos",
    comments: [
      { id: "ec1", author_id: "Leandro", text: "Já abasteci o carro!", timestamp: new Date().toISOString() }
    ]
  },
  {
    id: "event_3",
    title: "Consulta Médica da Kaisa",
    description: "Exames de rotina periódicos.",
    type: EventType.INDIVIDUAL,
    start_time: `${new Date().getFullYear()}-06-05T14:30:00`,
    responsible_id: "Kaisa",
    comments: []
  }
];

const DEFAULT_SHOPPING: ShoppingItem[] = [
  { id: "shop_1", name: "Tomate italiano", category: ShoppingCategory.HORTIFRUTI, quantity: 1, unit: "kg", price: 8.50, is_bought: false, added_by: "Kaisa" },
  { id: "shop_2", name: "Leite Integral Sem Lactose", category: ShoppingCategory.LATICINIOS, quantity: 4, unit: "caixas", price: 5.20, is_bought: false, added_by: "Leandro" },
  { id: "shop_3", name: "Alcatra bovina", category: ShoppingCategory.CARNES, quantity: 1.2, unit: "kg", price: 42.00, is_bought: true, bought_at: new Date(Date.now() - 400000).toISOString(), added_by: "Leandro" },
  { id: "shop_4", name: "Detergente de Maçã", category: ShoppingCategory.LIMPEZA, quantity: 2, unit: "unidades", price: 2.80, is_bought: false, added_by: "Kaisa" },
  { id: "shop_5", name: "Papel higiênico folha dupla", category: ShoppingCategory.HIGIENE, quantity: 1, unit: "pacote (12 un)", price: 18.90, is_bought: false, added_by: "Kaisa" }
];

const DEFAULT_EXPENSES: Expense[] = [
  { id: "exp_1", value: 350.00, currency: "R$", description: "Supermercado Semanal (Pão de Açúcar)", paid_by_id: "Leandro", split_type: "50/50", category: ExpenseCategory.ALIMENTACAO, date: new Date().toISOString().split("T")[0], is_recurring: false },
  { id: "exp_2", value: 1200.00, currency: "R$", description: "Aluguel & Condomínio", paid_by_id: "Kaisa", split_type: "50/50", category: ExpenseCategory.MORADIA, date: new Date(Date.now() - 4 * 24 * 3600000).toISOString().split("T")[0], is_recurring: true },
  { id: "exp_3", value: 85.00, currency: "R$", description: "Remédios Higiene Pet Shop (Luke)", paid_by_id: "Kaisa", split_type: "custom", custom_percent: 60, category: ExpenseCategory.PETS, date: new Date(Date.now() - 2 * 24 * 3600000).toISOString().split("T")[0], is_recurring: false },
  { id: "exp_4", value: 160.00, currency: "R$", description: "Cinema e Pipoca (Divertidamente)", paid_by_id: "Leandro", split_type: "paid_all", category: ExpenseCategory.LAZER, date: new Date(Date.now() - 5 * 24 * 3600000).toISOString().split("T")[0], is_recurring: false }
];

const DEFAULT_MEMORIES: Memory[] = [
  { id: "mem_1", url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=600", description: "Nossos sorrisos congelados na primeira que fomos à praia juntos!", date: `${new Date().getFullYear() - 1}-01-10`, location: "Ubatuba, SP", album_name: "Praia e Verão", created_at: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString() },
  { id: "mem_2", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600", description: "O dia que pegamos as chaves do nosso cantinho. Choro e emoção!", date: `${new Date().getFullYear()}-03-15`, location: "São Paulo, SP", album_name: "Nosso Apartamento", created_at: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString() },
  { id: "mem_3", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600", description: "Luke dormindo com a língua pra fora, não aguentamos e tivemos que tirar foto.", date: new Date().toISOString().split("T")[0], location: "Em casa", album_name: "Adorável Luke", created_at: new Date().toISOString() }
];

const DEFAULT_MOODS: MoodCheckIn[] = [
  { id: "mood_1", user_id: "Leandro", mood: MoodType.OTIMO, note: "Reunião de sprint deu super certo hoje!", share_note: true, date: new Date().toISOString().split("T")[0] },
  { id: "mood_2", user_id: "Kaisa", mood: MoodType.BEM, note: "Rotina corrida mas tudo sob controle", share_note: false, date: new Date().toISOString().split("T")[0] },
  { id: "mood_prev_1", user_id: "Leandro", mood: MoodType.BEM, date: new Date(Date.now() - 86400000).toISOString().split("T")[0], share_note: false },
  { id: "mood_prev_2", user_id: "Kaisa", mood: MoodType.CANSADO, note: "Faculdade cansativa demais", date: new Date(Date.now() - 86400000).toISOString().split("T")[0], share_note: true }
];

const DEFAULT_WISHLIST: WishlistItem[] = [
  { id: "wish_1", name: "Smart TV 4K 55 Polegadas", priority: "Alta", category: WishlistCategory.LAR, link: "https://example.com/tv", estimated_price: 2500, added_by: "Kaisa", saving_goal: 2500, saving_saved: 1200 },
  { id: "wish_2", name: "Anel de Prata Minimalista", priority: "Média", category: WishlistCategory.PESSOAL, link: "https://example.com/ring", estimated_price: 180, is_private_to_partner: true, added_by: "Leandro" },
  { id: "wish_3", name: "Máquina de Café Espresso Exclusiva", priority: "Média", category: WishlistCategory.LAR, estimated_price: 950, added_by: "Leandro", saving_goal: 950, saving_saved: 300 },
  { id: "wish_4", name: "Passagem de balão em Boituva", priority: "Alta", category: WishlistCategory.EXPERIENCIA, estimated_price: 800, added_by: "Ambos", saving_goal: 800, saving_saved: 800 }
];

const DEFAULT_RECIPES: Recipe[] = [
  { id: "rec_1", title: "Macarrão Cremoso de Manjericão", ingredients: ["Macarrão Penne - 300g", "Molho de tomate - 1 lata", "Manjericão fresco - 1 punhado", "Creme de leite - 1 caixinha", "Alho amassado - 2 dentes", "Azeite de oliva"], instructions: "1. Cozinhe o penne em água salgada até ficar al dente.\n2. Refogue o alho no azeite, adicione o molho de tomate e manjericão, cozinhe por 5 min.\n3. Misture o creme de leite no molho em fogo baixo.\n4. Escorra a massa e envolva-a completamente no creme aromático. Sirva quente com queijo ralado.", duration: 20, portions: 2, couple_rating: "Favorita", tags: ["rápida", "econômica", "vegetariana"] },
  { id: "rec_2", title: "Escondidinho de Carne Seca", ingredients: ["Mandioca cozida - 1kg", "Carne seca desfiada dessalgada - 500g", "Cebola picada - 1 un", "Manteiga - 2 colheres", "Leite integral - 1 xícara", "Queijo coalho ralado - 150g"], instructions: "1. Amasse a mandioca quente com manteiga e leite até virar um purê homogêneo.\n2. Refogue a carne seca com cebola até dourar.\n3. Num refratário, faça uma camada de carne, cubra com o purê de mandioca e polvilhe o queijo coalho.\n4. Leve ao forno para gratinar por 20 minutos a 200°C.", duration: 50, portions: 3, couple_rating: "Gostamos", tags: ["especial"] }
];

const DEFAULT_MEAL_PLAN: MealPlan[] = [
  { id: "Segunda-Café", day: "Segunda", meal_type: "Café", custom_text: "Mamão, ovos mexidos e café puro" },
  { id: "Segunda-Almoço", day: "Segunda", meal_type: "Almoço", recipe_id: "rec_1" },
  { id: "Segunda-Jantar", day: "Segunda", meal_type: "Jantar", custom_text: "Sopa leve de legumes e torrada" },
  { id: "Quarta-Jantar", day: "Quarta", meal_type: "Jantar", recipe_id: "rec_2" }
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: "inv_1", name: "Arroz agulhinha", quantity: 2, unit: "kg", min_quantity: 1 },
  { id: "inv_2", name: "Café Gourmet moído", quantity: 0.5, unit: "kg", min_quantity: 0.5 },
  { id: "inv_3", name: "Açúcar demerara", quantity: 0.2, unit: "kg", min_quantity: 0.5 },
  { id: "inv_4", name: "Sabonete líquido corpo", quantity: 1, unit: "unidade", min_quantity: 2 },
  { id: "inv_5", name: "Detergente de Maçã", quantity: 1, unit: "unidade", min_quantity: 1 }
];

const DEFAULT_REWARDS: Reward[] = [
  { id: "feet_massage", title: "Massagem nos Pés de 30min", cost: 65, desc: "Mozão massageia seus pés após um dia tenso de rotina.", emoji: "💆‍♂️", is_repeatable: true },
  { id: "breakfast_bed", title: "Café da Manhã na Cama", cost: 95, desc: "Servido com torrada, café quentinho e beijinhos de bom dia.", emoji: "☕", is_repeatable: true },
  { id: "movie_choice", title: "Escolha Soberana do Filme", cost: 35, desc: "Decide o filme de hoje sem receber reclamações do parceiro.", emoji: "🎬", is_repeatable: true },
  { id: "no_dishes", title: "Folga da Louça por 1 Dia", cost: 50, desc: "Isenção integral de lavar louça de qualquer refeição do dia.", emoji: "🧼", is_repeatable: true },
  { id: "dream_dessert", title: "Sobremesa Especial do Amor", cost: 75, desc: "Mozão prepara ou compra o doce ou bolo que você pedir.", emoji: "🍰", is_repeatable: true },
  { id: "full_massage", title: "Massageador nos Ombros & Costas", cost: 120, desc: "Sessão caprichada com óleos relaxantes e silêncio absoluto.", emoji: "🕯️", is_repeatable: true }
];

const DEFAULT_QUESTS: Quest[] = [
  { id: "quest_1", title: "Guardiões da Faxina", description: "Concluir 3 tarefas de limpeza no painel.", points: 20, type: "Faxina", target_count: 3, current_count: 0, completed: false },
  { id: "quest_2", title: "Dupla Harmonia", description: "Ambos fazerem o check-in de humor de hoje.", points: 15, type: "Afeto", target_count: 2, current_count: 0, completed: false },
  { id: "quest_3", title: "Menu NósDois", description: "Registrar receitas especiais e favoritas.", points: 25, type: "Culinária", target_count: 1, current_count: 0, completed: false }
];

const DEFAULT_PETS: Pet[] = [
  {
    id: "pet_luke",
    name: "Luke",
    breed: "Golden Retriever",
    age: 2,
    avatar_url: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=150",
    coupleId: "couple_1",
    food_daily_qty: 350,
    vaccines: [
      { id: "vk1", name: "Raiva (Anual)", date_applied: "2025-11-15", next_dose_date: "2026-11-15", is_completed: true },
      { id: "vk2", name: "V10 Quádrupla", date_applied: "2025-12-10", next_dose_date: "2026-12-10", is_completed: true }
    ],
    medications: [
      { id: "md1", name: "Simparic (Antipulgas)", type: "Antiparasitário", date: "2026-05-01", notes: "Dar mensalmente" },
      { id: "md2", name: "Vermífugo Drontal", type: "Remédio", date: "2026-03-15", notes: "Dose trimestral" }
    ],
    weights: [
      { id: "wt1", weight: 28.5, date: "2026-01-10" },
      { id: "wt2", weight: 29.8, date: "2026-03-15" },
      { id: "wt3", weight: 31.2, date: "2026-05-18" }
    ],
    documents: [
      { id: "pt_doc_1", title: "Pedigree de Registro.pdf", link: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format", date_created: "2026-01-20" },
      { id: "pt_doc_2", title: "Histórico Clínico Dr. Ana.pdf", link: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format", date_created: "2026-04-10" }
    ]
  }
];

const DEFAULT_HOUSE_DOCUMENTS = [
  { id: "h_doc_1", title: "Contrato de Locação.pdf", category: "Aluguel", link: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format", date_added: "2026-02-01", coupleId: "couple_1" },
  { id: "h_doc_2", title: "Manual do Proprietário.pdf", category: "Plantas/Manual", link: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format", date_added: "2026-02-15", coupleId: "couple_1" }
];

const DEFAULT_HOUSE_MAINTENANCES = [
  { id: "h_maint_1", title: "Limpar o filtro do Ar Condicionado", category: "Eletrodomésticos", due_date: "2026-06-15", status: "pending", points: 15, coupleId: "couple_1" },
  { id: "h_maint_2", title: "Revisão aquecedor de gás", category: "Hidráulica", due_date: "2026-07-20", status: "pending", points: 20, coupleId: "couple_1" }
];

const DEFAULT_HOUSE_CONTACTS = [
  { id: "h_contact_1", name: "Sr. João (Encanador)", role: "Hidráulica e Reparos urgentes", phone: "(11) 98888-7777", coupleId: "couple_1" },
  { id: "h_contact_2", name: "Portaria Condomínio", role: "Segurança 24h", phone: "(11) 3222-1111", coupleId: "couple_1" }
];

const DEFAULT_FIXED_BILLS = [
  { id: "h_bill_1", name: "Aluguel & Condomínio Lar", value: "2450.00", due_date: "2026-06-10", is_paid: false, coupleId: "couple_1" },
  { id: "h_bill_2", name: "Internet Fibra Óptica", value: "119.90", due_date: "2026-06-15", is_paid: false, coupleId: "couple_1" }
];

const DEFAULT_SPICY_REWARDS = [
  { id: "spicy_1", title: "Vale Striptease", description: "Uma performance exclusiva só para você.", cost: 200, emoji: "🌶️", is_repeatable: true, created_by: "system", coupleId: "couple_1", created_at: new Date().toISOString(), is_active: true },
  { id: "spicy_2", title: "Massagem Sensual", description: "30 minutos de massagem com óleos aromáticos.", cost: 180, emoji: "💆‍♀️", is_repeatable: true, created_by: "system", coupleId: "couple_1", created_at: new Date().toISOString(), is_active: true },
  { id: "spicy_3", title: "Noite de Spa a Dois", description: "Banho de imersão, velas e relaxamento total.", cost: 350, emoji: "🛁", is_repeatable: true, created_by: "system", coupleId: "couple_1", created_at: new Date().toISOString(), is_active: true },
  { id: "spicy_4", title: "Jantar Romântico em Casa", description: "Parceiro prepara um jantar especial com direito a sobremesa.", cost: 150, emoji: "🍽️", is_repeatable: true, created_by: "system", coupleId: "couple_1", created_at: new Date().toISOString(), is_active: true }
];

const DEFAULT_SPICY_QUESTS = [
  { id: "sq_1", title: "Sexta do Amor", description: "Planejem uma noite especial juntos, sem celular.", bonus_xp: 100, bonus_coins: 200, created_by: "system", coupleId: "couple_1", created_at: new Date().toISOString(), is_active: true, is_featured: true },
  { id: "sq_2", title: "Desafio da Semana", description: "Tentem algo novo juntos que nunca fizeram.", bonus_xp: 80, bonus_coins: 150, created_by: "system", coupleId: "couple_1", created_at: new Date().toISOString(), is_active: true, is_featured: false }
];

const DEFAULT_LOVE_DICE_ACTIONS = [
  { id: "da_1", text: "Beijar", created_by: "system", coupleId: "couple_1", is_active: true, order: 1 },
  { id: "da_2", text: "Massagem", created_by: "system", coupleId: "couple_1", is_active: true, order: 2 },
  { id: "da_3", text: "Cafuné", created_by: "system", coupleId: "couple_1", is_active: true, order: 3 },
  { id: "da_4", text: "Abraço apertado", created_by: "system", coupleId: "couple_1", is_active: true, order: 4 },
  { id: "da_5", text: "Beijo no pescoço", created_by: "system", coupleId: "couple_1", is_active: true, order: 5 },
  { id: "da_6", text: "Sussurrar algo sexy", created_by: "system", coupleId: "couple_1", is_active: true, order: 6 }
];

const DEFAULT_LOVE_DICE_LOCATIONS = [
  { id: "dl_1", text: "nos lábios", created_by: "system", coupleId: "couple_1", is_active: true, order: 1 },
  { id: "dl_2", text: "no pescoço", created_by: "system", coupleId: "couple_1", is_active: true, order: 2 },
  { id: "dl_3", text: "nas costas", created_by: "system", coupleId: "couple_1", is_active: true, order: 3 },
  { id: "dl_4", text: "na orelha", created_by: "system", coupleId: "couple_1", is_active: true, order: 4 },
  { id: "dl_5", text: "no ombro", created_by: "system", coupleId: "couple_1", is_active: true, order: 5 },
  { id: "dl_6", text: "na mão", created_by: "system", coupleId: "couple_1", is_active: true, order: 6 }
];

const DEFAULT_SECRET_FANTASIES = [
  { id: "sf_1", title: "Jantar romântico em casa com velas", category: "Romance", added_by: "system", is_custom: false, is_active: true },
  { id: "sf_2", title: "Massagem com óleos aromáticos", category: "Intimidade", added_by: "system", is_custom: false, is_active: true },
  { id: "sf_3", title: "Viagem de fim de semana surpresa", category: "Aventura", added_by: "system", is_custom: false, is_active: true },
  { id: "sf_4", title: "Noite de filmes com pipoca e cobertor", category: "Romance", added_by: "system", is_custom: false, is_active: true },
  { id: "sf_5", title: "Banho de banheira juntos", category: "Intimidade", added_by: "system", is_custom: false, is_active: true },
  { id: "sf_6", title: "Piquenique no parque ao pôr do sol", category: "Romance", added_by: "system", is_custom: false, is_active: true }
];

const DEFAULT_DATE_OPTIONS = [
  { id: "do_1", title: "Jantar romântico italiano", category: "restaurante", emoji: "🍝", created_by: "system", coupleId: "couple_1", is_active: true, times_chosen: 0 },
  { id: "do_2", title: "Sessão de cinema", category: "filme", emoji: "🎬", created_by: "system", coupleId: "couple_1", is_active: true, times_chosen: 0 },
  { id: "do_3", title: "Passeio no parque", category: "passeio", emoji: "🌳", created_by: "system", coupleId: "couple_1", is_active: true, times_chosen: 0 },
  { id: "do_4", title: "Noite de jogos em casa", category: "em_casa", emoji: "🎲", created_by: "system", coupleId: "couple_1", is_active: true, times_chosen: 0 },
  { id: "do_5", title: "Viagem de um dia", category: "aventura", emoji: "🚗", created_by: "system", coupleId: "couple_1", is_active: true, times_chosen: 0 },
  { id: "do_6", title: "Barzinho com música ao vivo", category: "outro", emoji: "🎤", created_by: "system", coupleId: "couple_1", is_active: true, times_chosen: 0 }
];

const DEFAULT_WATCHLIST = [
  { id: "wl_1", title: "La La Land", type: "filme", genre: "Romance", platform: "Netflix", suggested_by: "Leandro", coupleId: "couple_1", status: "quero_ver", whose_turn: "Kaisa", added_at: new Date().toISOString(), poster_url: "https://images.unsplash.com/photo-1489599849925-91991ef6ad7d?auto=format&fit=crop&q=80&w=150" },
  { id: "wl_2", title: "Stranger Things", type: "serie", genre: "Ficção Científica", platform: "Netflix", suggested_by: "Kaisa", coupleId: "couple_1", status: "assistindo", current_episode: 3, total_episodes: 8, whose_turn: "Leandro", added_at: new Date().toISOString(), poster_url: "https://images.unsplash.com/photo-1594909122845-11c5497e7b54?auto=format&fit=crop&q=80&w=150" }
];

// ==========================================
// MONGODB CONNECTION
// ==========================================

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB_NAME || "nosdois";

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI não está definida nas variáveis de ambiente!");
}

let client: MongoClient;
let mongoDb: Db;

async function getMongoDb(): Promise<Db> {
  if (mongoDb) return mongoDb;
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  mongoDb = client.db(DB_NAME);
  console.log(`✅ MongoDB conectado: ${DB_NAME}`);
  return mongoDb;
}

// ==========================================
// IN-MEMORY STORE (espelho do MongoDB em RAM)
// O server.ts usa db.getStore() de forma síncrona,
// então mantemos um cache em memória que é
// sincronizado com o MongoDB de forma assíncrona.
// ==========================================

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

function buildDefaultStore(): DatabaseSchema {
  return {
    users: { ...DEFAULT_USERS },
    couple: { ...DEFAULT_COUPLE },
    couples: { couple_1: { ...DEFAULT_COUPLE } },
    couplesUsers: { couple_1: { ...DEFAULT_USERS } },
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
    fixedFunctions: [],
    quizzes: [],
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

// ==========================================
// DBStore — mesma interface pública de antes
// ==========================================

export class DBStore {
  private data: DatabaseSchema = buildDefaultStore();
  private initialized = false;
  private saveDebounce: NodeJS.Timeout | null = null;

  // Chamado uma vez no startup do servidor
  public async init(): Promise<void> {
    if (this.initialized) return;
    const mdb = await getMongoDb();
    const col = mdb.collection<{ _id: string } & DatabaseSchema>("store");

    const saved = await col.findOne({ _id: "main" });

    if (saved) {
      // Remove o campo _id do MongoDB antes de usar como store
      const { _id, ...rest } = saved as any;
      this.data = this.mergeWithDefaults(rest);
      console.log("✅ Estado carregado do MongoDB");
    } else {
      // Primeira vez: grava os seeds no MongoDB
      await col.insertOne({ _id: "main", ...this.data } as any);
      console.log("✅ Seeds gravados no MongoDB (primeira inicialização)");
    }

    this.initialized = true;
  }

  // Merge garante backward-compat quando novos campos são adicionados
  private mergeWithDefaults(saved: Partial<DatabaseSchema>): DatabaseSchema {
    const defaults = buildDefaultStore();
    return {
      ...defaults,
      ...saved,
      // Garante que arrays nunca fiquem undefined
      tasks:                  saved.tasks                  ?? defaults.tasks,
      events:                 saved.events                 ?? defaults.events,
      shopping:               saved.shopping               ?? defaults.shopping,
      expenses:               saved.expenses               ?? defaults.expenses,
      memories:               saved.memories               ?? defaults.memories,
      moods:                  saved.moods                  ?? defaults.moods,
      wishlist:               saved.wishlist               ?? defaults.wishlist,
      recipes:                saved.recipes                ?? defaults.recipes,
      mealPlan:               saved.mealPlan               ?? defaults.mealPlan,
      inventory:              saved.inventory              ?? defaults.inventory,
      rewards:                saved.rewards?.length        ? saved.rewards    : defaults.rewards,
      quests:                 saved.quests?.length         ? saved.quests     : defaults.quests,
      quickNotes:             saved.quickNotes             ?? [],
      pets:                   saved.pets?.length           ? saved.pets       : defaults.pets,
      houseDocuments:         saved.houseDocuments?.length ? saved.houseDocuments  : defaults.houseDocuments,
      houseMaintenances:      saved.houseMaintenances?.length ? saved.houseMaintenances : defaults.houseMaintenances,
      houseContacts:          saved.houseContacts?.length  ? saved.houseContacts  : defaults.houseContacts,
      fixedBills:             saved.fixedBills?.length     ? saved.fixedBills    : defaults.fixedBills,
      spicyRewards:           saved.spicyRewards?.length   ? saved.spicyRewards  : defaults.spicyRewards,
      spicyQuests:            saved.spicyQuests?.length    ? saved.spicyQuests   : defaults.spicyQuests,
      spicyQuestCompletions:  saved.spicyQuestCompletions  ?? [],
      loveDiceActions:        saved.loveDiceActions?.length ? saved.loveDiceActions  : defaults.loveDiceActions,
      loveDiceLocations:      saved.loveDiceLocations?.length ? saved.loveDiceLocations : defaults.loveDiceLocations,
      loveDiceRolls:          saved.loveDiceRolls          ?? [],
      secretFantasies:        saved.secretFantasies?.length ? saved.secretFantasies : defaults.secretFantasies,
      userFantasySelections:  saved.userFantasySelections  ?? [],
      intimacyCheckins:       saved.intimacyCheckins       ?? [],
      intimacyInsights:       saved.intimacyInsights       ?? [],
      dateOptions:            saved.dateOptions?.length     ? saved.dateOptions   : defaults.dateOptions,
      dateGachaRolls:         saved.dateGachaRolls         ?? [],
      watchlistItems:         saved.watchlistItems?.length  ? saved.watchlistItems : defaults.watchlistItems,
      watchHistory:           saved.watchHistory           ?? [],
      wishlistDeposits:       saved.wishlistDeposits       ?? []
    };
  }

  // Gravação assíncrona com debounce de 300ms para evitar writes excessivos
  private async persistToMongo() {
    try {
      const mdb = await getMongoDb();
      const col = mdb.collection("store");
      await col.replaceOne({ _id: "main" }, { _id: "main", ...this.data } as any, { upsert: true });
    } catch (err) {
      console.error("❌ Erro ao salvar no MongoDB:", err);
    }
  }

  // ==========================================
  // Interface pública (idêntica à versão JSON)
  // ==========================================

  public getStore(): DatabaseSchema {
    return this.data;
  }

  public saveStore() {
    // Debounce: agrupa saves rápidos em uma única escrita
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => {
      this.persistToMongo();
    }, 300);
  }

  public async resetToDefaults() {
    this.data = buildDefaultStore();
    await this.persistToMongo();
  }
}

export const db = new DBStore();
