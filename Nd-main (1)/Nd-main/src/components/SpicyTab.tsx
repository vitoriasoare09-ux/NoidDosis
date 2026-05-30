import React, { useState, useEffect } from "react";
import { Flame, Lock, Clock as Unlock, Zap, Heart, Trash2, CreditCard as Edit, Dice1, Dice2, Gift, Calendar, Film, Tv, Sparkles, Plus, X, Check, Star, TrendingUp, Eye, EyeOff, RefreshCw } from "lucide-react";
import confetti from "canvas-confetti";

interface SpicyTabProps {
  currentUser: string | null;
  partnerUser: any;
  state: any;
  triggerCustomNotify: (msg: string, type: "success" | "error" | "info") => void;
  onRefresh: () => void;
  handleAction: (endpoint: string, payload: any) => Promise<any>;
  appFetch: (url: string, options?: any) => Promise<any>;
}

type SpicySection = "rewards" | "quests" | "dice" | "fantasies" | "tracker" | "dates" | "watchlist";

export default function SpicyTab({
  currentUser,
  partnerUser,
  state,
  triggerCustomNotify,
  onRefresh,
  handleAction,
  appFetch
}: SpicyTabProps) {
  const [activeSection, setActiveSection] = useState<SpicySection>("rewards");
  const [loading, setLoading] = useState(false);

  // Section-specific state
  const [spicyRewards, setSpicyRewards] = useState<any[]>([]);
  const [spicyQuests, setSpicyQuests] = useState<any[]>([]);
  const [diceActions, setDiceActions] = useState<any[]>([]);
  const [diceLocations, setDiceLocations] = useState<any[]>([]);
  const [lastDiceResult, setLastDiceResult] = useState<any>(null);
  const [fantasies, setFantasies] = useState<any[]>([]);
  const [myFantasySelections, setMyFantasySelections] = useState<any[]>([]);
  const [matchedFantasies, setMatchedFantasies] = useState<any[]>([]);
  const [intimacyCheckins, setIntimacyCheckins] = useState<any[]>([]);
  const [intimacyInsights, setIntimacyInsights] = useState<any[]>([]);
  const [dateOptions, setDateOptions] = useState<any[]>([]);
  const [lastDateResult, setLastDateResult] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);

  // Form states
  const [editingReward, setEditingReward] = useState<any>(null);
  const [editingQuest, setEditingQuest] = useState<any>(null);
  const [editingDiceAction, setEditingDiceAction] = useState<any>(null);
  const [editingDiceLocation, setEditingDiceLocation] = useState<any>(null);
  const [editingDateOption, setEditingDateOption] = useState<any>(null);
  const [editingWatchlistItem, setEditingWatchlistItem] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const myCoins = currentUser && state.users?.[currentUser]?.coins ? state.users[currentUser].coins : 0;
  const myXP = currentUser && state.users?.[currentUser]?.points_weekly ? state.users[currentUser].points_weekly : 0;

  // Load data on mount and section change
  useEffect(() => {
    loadSectionData(activeSection);
  }, [activeSection]);

  const loadSectionData = async (section: SpicySection) => {
    setLoading(true);
    try {
      switch (section) {
        case "rewards":
          const rewardsRes = await appFetch("/api/spicy-rewards");
          if (rewardsRes.rewards) setSpicyRewards(rewardsRes.rewards);
          break;
        case "quests":
          const questsRes = await appFetch("/api/spicy-quests");
          if (questsRes.quests) setSpicyQuests(questsRes.quests);
          break;
        case "dice":
          const diceRes = await appFetch("/api/love-dice/config");
          if (diceRes.actions) setDiceActions(diceRes.actions);
          if (diceRes.locations) setDiceLocations(diceRes.locations);
          break;
        case "fantasies":
          const [fantRes, selRes] = await Promise.all([
            appFetch("/api/fantasies"),
            appFetch("/api/fantasies/my-selections")
          ]);
          if (fantRes.fantasies) setFantasies(fantRes.fantasies);
          if (selRes.selections) setMyFantasySelections(selRes.selections);
          if (selRes.matchedCount > 0) {
            // Get revealed matches
            const matched = selRes.selections.filter((s: any) => s.is_matched);
            setMatchedFantasies(matched);
          }
          break;
        case "tracker":
          const [checkinsRes, insightsRes] = await Promise.all([
            appFetch("/api/intimacy/checkins"),
            appFetch("/api/intimacy/insights")
          ]);
          if (checkinsRes.checkins) setIntimacyCheckins(checkinsRes.checkins);
          if (insightsRes.insights) setIntimacyInsights(insightsRes.insights);
          break;
        case "dates":
          const datesRes = await appFetch("/api/date-options");
          if (datesRes.options) setDateOptions(datesRes.options);
          break;
        case "watchlist":
          const watchlistRes = await appFetch("/api/watchlist");
          if (watchlistRes.watchlist) setWatchlist(watchlistRes.watchlist);
          break;
      }
    } catch (err) {
      console.error("Error loading section data:", err);
    }
    setLoading(false);
  };

  // ========== MERCADO NEGRO (SPICY REWARDS) ==========

  const handleCreateReward = async (data: any) => {
    try {
      const res = await appFetch("/api/spicy-rewards/create", {
        method: "POST",
        body: JSON.stringify(data)
      });
      if (res.success) {
        triggerCustomNotify("Recompensa criada no Mercado Negro!", "success");
        loadSectionData("rewards");
        setShowAddForm(false);
      }
    } catch (err) {
      triggerCustomNotify("Erro ao criar recompensa", "error");
    }
  };

  const handleUpdateReward = async (data: any) => {
    try {
      const res = await appFetch("/api/spicy-rewards/update", {
        method: "POST",
        body: JSON.stringify(data)
      });
      if (res.success) {
        triggerCustomNotify("Recompensa atualizada!", "success");
        loadSectionData("rewards");
        setEditingReward(null);
      }
    } catch (err) {
      triggerCustomNotify("Erro ao atualizar", "error");
    }
  };

  const handleDeleteReward = async (id: string) => {
    if (!confirm("Excluir esta recompensa?")) return;
    try {
      const res = await appFetch("/api/spicy-rewards/delete", {
        method: "POST",
        body: JSON.stringify({ id })
      });
      if (res.success) {
        triggerCustomNotify("Recompensa removida", "success");
        loadSectionData("rewards");
      }
    } catch (err) {
      triggerCustomNotify("Erro ao excluir", "error");
    }
  };

  const handleRedeemReward = async (rewardId: string, title: string, cost: number) => {
    if (myCoins < cost) {
      triggerCustomNotify(`Faltam moedas! Você tem ${myCoins}/${cost}`, "error");
      return;
    }
    if (!confirm(`Resgatar "${title}" por ${cost} moedas?`)) return;

    try {
      const res = await appFetch("/api/spicy-rewards/redeem", {
        method: "POST",
        body: JSON.stringify({ rewardId })
      });
      if (res.success) {
        triggerCustomNotify(res.message, "success");
        onRefresh();
      } else {
        triggerCustomNotify(res.error || "Erro ao resgatar", "error");
      }
    } catch (err) {
      triggerCustomNotify("Erro ao processar", "error");
    }
  };

  // ========== MISSÕES +18 (SPICY QUESTS) ==========

  const handleCreateQuest = async (data: any) => {
    try {
      const res = await appFetch("/api/spicy-quests/create", {
        method: "POST",
        body: JSON.stringify(data)
      });
      if (res.success) {
        triggerCustomNotify("Missão especial criada!", "success");
        loadSectionData("quests");
        setShowAddForm(false);
      }
    } catch (err) {
      triggerCustomNotify("Erro ao criar missão", "error");
    }
  };

  const handleCompleteQuest = async (questId: string) => {
    try {
      const res = await appFetch("/api/spicy-quests/complete", {
        method: "POST",
        body: JSON.stringify({ questId })
      });
      if (res.success) {
        triggerCustomNotify(`Missão completada! +${res.quest.bonus_xp} XP, +${res.quest.bonus_coins} moedas!`, "success");
        confetti({ particleCount: 100, spread: 70 });
        onRefresh();
      } else {
        triggerCustomNotify(res.error || "Erro", "error");
      }
    } catch (err) {
      triggerCustomNotify("Erro ao completar missão", "error");
    }
  };

  const handleDeleteQuest = async (id: string) => {
    if (!confirm("Excluir esta missão?")) return;
    try {
      const res = await appFetch("/api/spicy-quests/delete", {
        method: "POST",
        body: JSON.stringify({ id })
      });
      if (res.success) {
        triggerCustomNotify("Missão removida", "success");
        loadSectionData("quests");
      }
    } catch (err) {
      triggerCustomNotify("Erro ao excluir", "error");
    }
  };

  // ========== DADOS DO AMOR ==========

  const handleCreateDiceAction = async (text: string) => {
    try {
      const res = await appFetch("/api/love-dice/actions/create", {
        method: "POST",
        body: JSON.stringify({ text })
      });
      if (res.success) {
        loadSectionData("dice");
        setShowAddForm(false);
      }
    } catch (err) {
      triggerCustomNotify("Erro", "error");
    }
  };

  const handleCreateDiceLocation = async (text: string) => {
    try {
      const res = await appFetch("/api/love-dice/locations/create", {
        method: "POST",
        body: JSON.stringify({ text })
      });
      if (res.success) {
        loadSectionData("dice");
        setShowAddForm(false);
      }
    } catch (err) {
      triggerCustomNotify("Erro", "error");
    }
  };

  const handleRollDice = async () => {
    try {
      const res = await appFetch("/api/love-dice/roll", {
        method: "POST",
        body: JSON.stringify({ coin_cost: 0 })
      });
      if (res.success) {
        setLastDiceResult(res.result);
        triggerCustomNotify(`🎲 ${res.result.full_text}`, "success");
      }
    } catch (err) {
      triggerCustomNotify("Erro ao rolar dados", "error");
    }
  };

  // ========== COFRE DE FANTASIAS ==========

  const handleSelectFantasy = async (fantasyId: string) => {
    try {
      const res = await appFetch("/api/fantasies/select", {
        method: "POST",
        body: JSON.stringify({ fantasyId })
      });
      if (res.success) {
        if (res.matched) {
          triggerCustomNotify("💕 MATCH! Vocês combinaram!", "success");
          confetti({ particleCount: 150, spread: 100 });
        } else {
          triggerCustomNotify("Fantasia registrada. Aguardando parceiro(a)...", "info");
        }
        loadSectionData("fantasies");
      }
    } catch (err) {
      triggerCustomNotify("Erro", "error");
    }
  };

  const handleRevealFantasy = async (selectionId: string) => {
    try {
      const res = await appFetch("/api/fantasies/reveal", {
        method: "POST",
        body: JSON.stringify({ selectionId })
      });
      if (res.success && res.fantasy) {
        triggerCustomNotify(`🔥 ${res.fantasy.title} revelado!`, "success");
        loadSectionData("fantasies");
      }
    } catch (err) {
      triggerCustomNotify("Erro ao revelar", "error");
    }
  };

  // ========== TRACKER DE INTIMIDADE ==========

  const handleAddIntimacyCheckin = async (type: string, notes?: string) => {
    try {
      const res = await appFetch("/api/intimacy/checkins/create", {
        method: "POST",
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          type,
          notes
        })
      });
      if (res.success) {
        triggerCustomNotify("Momento registrado!", "success");
        loadSectionData("tracker");
      }
    } catch (err) {
      triggerCustomNotify("Erro", "error");
    }
  };

  // ========== ENCONTRO GACHA ==========

  const handleCreateDateOption = async (data: any) => {
    try {
      const res = await appFetch("/api/date-options/create", {
        method: "POST",
        body: JSON.stringify(data)
      });
      if (res.success) {
        triggerCustomNotify("Opção de encontro adicionada!", "success");
        loadSectionData("dates");
        setShowAddForm(false);
      }
    } catch (err) {
      triggerCustomNotify("Erro", "error");
    }
  };

  const handleRollDate = async () => {
    try {
      const res = await appFetch("/api/date-options/roll", {
        method: "POST",
        body: JSON.stringify({})
      });
      if (res.success) {
        setLastDateResult(res.result);
        triggerCustomNotify(`🎯 ${res.result.emoji} ${res.result.title}`, "success");
      }
    } catch (err) {
      triggerCustomNotify("Erro ao sortear", "error");
    }
  };

  // ========== WATCHLIST ==========

  const handleCreateWatchlistItem = async (data: any) => {
    try {
      const res = await appFetch("/api/watchlist/create", {
        method: "POST",
        body: JSON.stringify(data)
      });
      if (res.success) {
        triggerCustomNotify("Adicionado à watchlist!", "success");
        loadSectionData("watchlist");
        setShowAddForm(false);
      }
    } catch (err) {
      triggerCustomNotify("Erro", "error");
    }
  };

  const handleWatchEpisode = async (itemId: string) => {
    try {
      const res = await appFetch("/api/watchlist/watch-episode", {
        method: "POST",
        body: JSON.stringify({ itemId })
      });
      if (res.success) {
        onRefresh();
        loadSectionData("watchlist");
      }
    } catch (err) {
      triggerCustomNotify("Erro", "error");
    }
  };

  const handleSuggestRandom = async () => {
    try {
      const res = await appFetch("/api/watchlist/suggest-random");
      if (res.suggestion) {
        triggerCustomNotify(`Sugestão: ${res.suggestion.title}`, "info");
      } else {
        triggerCustomNotify(res.message || "Nenhuma sugestão disponível", "info");
      }
    } catch (err) {
      triggerCustomNotify("Erro", "error");
    }
  };

  // ========== RENDER ==========

  const sections: { id: SpicySection; label: string; icon: React.ReactNode }[] = [
    { id: "rewards", label: "Mercado Negro", icon: <Gift className="w-4 h-4" /> },
    { id: "quests", label: "Missoes +18", icon: <Flame className="w-4 h-4" /> },
    { id: "dice", label: "Dados do Amor", icon: <Dice1 className="w-4 h-4" /> },
    { id: "fantasies", label: "Cofre de Fantasias", icon: <Lock className="w-4 h-4" /> },
    { id: "tracker", label: "Tracker", icon: <Calendar className="w-4 h-4" /> },
    { id: "dates", label: "Encontro Gacha", icon: <Sparkles className="w-4 h-4" /> },
    { id: "watchlist", label: "Watchlist", icon: <Tv className="w-4 h-4" /> }
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl p-4 text-white shadow-lg">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Flame className="w-6 h-6" /> Intimidade
        </h2>
        <p className="text-xs text-red-100 mt-1">Mecanicas exclusivas para a vida a dois</p>
        <div className="flex gap-4 mt-3 text-sm">
          <div className="bg-white/20 px-3 py-1 rounded-lg">
            <span className="font-bold">{myCoins}</span> moedas
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-lg">
            <span className="font-bold">{myXP}</span> XP
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeSection === s.id
                ? "bg-red-600 text-white shadow-md"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* MERCADO NEGRO */}
            {activeSection === "rewards" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Mercado Negro</h3>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">Premios ousados com custos altos. Customize sua loja!</p>

                {showAddForm && (
                  <RewardForm
                    onSave={handleCreateReward}
                    onCancel={() => setShowAddForm(false)}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {spicyRewards.map(r => (
                    <div key={r.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-2xl">{r.emoji}</span>
                          <h4 className="font-bold text-sm">{r.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2">{r.description}</p>
                        </div>
                        <button
                          onClick={() => setEditingReward(r)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          {r.cost} moedas
                        </span>
                        <button
                          onClick={() => handleRedeemReward(r.id, r.title, r.cost)}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700"
                        >
                          Resgatar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MISSOES +18 */}
            {activeSection === "quests" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Missoes Especiais +18</h3>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">Complete e ganhe bonus enormes em XP e moedas!</p>

                {showAddForm && (
                  <QuestForm
                    onSave={handleCreateQuest}
                    onCancel={() => setShowAddForm(false)}
                  />
                )}

                {spicyQuests.map(q => (
                  <div key={q.id} className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-slate-800 dark:to-slate-800 border border-red-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold">{q.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{q.description}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteQuest(q.id)}
                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        +{q.bonus_coins} moedas
                      </span>
                      <span className="bg-violet-100 text-violet-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        +{q.bonus_xp} XP
                      </span>
                      {q.is_featured && (
                        <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                          Destaque
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCompleteQuest(q.id)}
                      className="mt-3 w-full bg-red-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-700"
                    >
                      Completar Missao
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* DADOS DO AMOR */}
            {activeSection === "dice" && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="font-bold text-lg">Dados do Amor</h3>
                  <p className="text-xs text-slate-500">Role os dados e descubra o que fazer!</p>
                </div>

                {lastDiceResult && (
                  <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl p-6 text-center animate-pulse">
                    <p className="text-2xl font-bold">{lastDiceResult.full_text}</p>
                  </div>
                )}

                <button
                  onClick={handleRollDice}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Dice1 className="w-6 h-6" /> <Dice2 className="w-6 h-6" /> Rolar Dados
                </button>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-sm">Acoes</h4>
                      <button
                        onClick={() => {
                          setShowAddForm(true);
                          setEditingDiceAction({ isNew: true });
                        }}
                        className="text-red-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {diceActions.map(a => (
                        <div key={a.id} className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-xs">
                          {a.text}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-sm">Locais</h4>
                      <button
                        onClick={() => {
                          setShowAddForm(true);
                          setEditingDiceLocation({ isNew: true });
                        }}
                        className="text-red-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {diceLocations.map(l => (
                        <div key={l.id} className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-xs">
                          {l.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* COFRE DE FANTASIAS */}
            {activeSection === "fantasies" && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-bold text-lg">Cofre de Fantasias</h3>
                  <p className="text-xs text-slate-500">Selecione fantasias em segredo. So revela se ambos escolherem a mesma!</p>
                </div>

                {matchedFantasies.length > 0 && (
                  <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl p-4">
                    <p className="font-bold flex items-center gap-2">
                      <Heart className="w-5 h-5 fill-white" /> Vocês tem {matchedFantasies.length} match(es)!
                    </p>
                    <div className="mt-2 space-y-2">
                      {matchedFantasies.map((m: any) => (
                        <button
                          key={m.id}
                          onClick={() => handleRevealFantasy(m.id)}
                          className="w-full bg-white/20 hover:bg-white/30 p-2 rounded-lg text-sm"
                        >
                          {m.is_revealed ? m.fantasy?.title : "Toque para revelar..."}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fantasies.map(f => (
                    <div key={f.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                      <h4 className="font-bold text-sm flex items-center gap-2">
                        <Lock className="w-3 h-3 text-red-500" /> {f.title}
                      </h4>
                      {f.description && (
                        <p className="text-xs text-slate-500 mt-1">{f.description}</p>
                      )}
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded mt-2 inline-block">
                        {f.category}
                      </span>
                      <button
                        onClick={() => handleSelectFantasy(f.id)}
                        className="mt-2 w-full bg-red-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-red-700"
                      >
                        Selecionar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TRACKER DE INTIMIDADE */}
            {activeSection === "tracker" && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Tracker de Intimidade</h3>

                <div className="grid grid-cols-3 gap-2">
                  {["date_night", "special_moment", "quality_time"].map(type => (
                    <button
                      key={type}
                      onClick={() => handleAddIntimacyCheckin(type)}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-red-500 transition"
                    >
                      <Calendar className="w-5 h-5 mx-auto mb-1 text-red-500" />
                      <p className="text-xs font-bold">
                        {type === "date_night" ? "Date Night" : type === "special_moment" ? "Momento Especial" : "Tempo de Qualidade"}
                      </p>
                    </button>
                  ))}
                </div>

                {intimacyInsights.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 border border-amber-200 dark:border-slate-700 rounded-xl p-4">
                    <h4 className="font-bold flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-amber-600" /> Insights
                    </h4>
                    {intimacyInsights.map(i => (
                      <p key={i.id} className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                        {i.insight_text}
                      </p>
                    ))}
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <h4 className="font-bold text-sm mb-2">Historico</h4>
                  {intimacyCheckins.slice(-5).reverse().map((c: any) => (
                    <div key={c.id} className="text-xs py-1 border-b border-slate-200 dark:border-slate-700 last:border-0">
                      <span className="font-bold">{c.date}</span> - {c.type.replace("_", " ")}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ENCONTRO GACHA */}
            {activeSection === "dates" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Encontro Gacha</h3>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">Nao sabe onde ir? Deixe o acaso decidir!</p>

                {showAddForm && (
                  <DateOptionForm
                    onSave={handleCreateDateOption}
                    onCancel={() => setShowAddForm(false)}
                  />
                )}

                {lastDateResult && (
                  <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl p-6 text-center">
                    <p className="text-4xl mb-2">{lastDateResult.emoji}</p>
                    <p className="text-xl font-bold">{lastDateResult.title}</p>
                  </div>
                )}

                <button
                  onClick={handleRollDate}
                  className="w-full bg-gradient-to-r from-violet-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:shadow-lg"
                >
                  <Sparkles className="w-5 h-5 inline mr-2" /> Sortear Encontro!
                </button>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {dateOptions.map(d => (
                    <div key={d.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-2xl">{d.emoji}</span>
                      <p className="text-xs font-bold mt-1">{d.title}</p>
                      <p className="text-[10px] text-slate-500">{d.category}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WATCHLIST */}
            {activeSection === "watchlist" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Watchlist do Casal</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSuggestRandom}
                      className="bg-violet-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-violet-700"
                    >
                      Sugerir Aleatorio
                    </button>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {showAddForm && (
                  <WatchlistForm
                    onSave={handleCreateWatchlistItem}
                    onCancel={() => setShowAddForm(false)}
                  />
                )}

                <div className="space-y-2">
                  {watchlist.map(w => (
                    <div key={w.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          {w.type}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm">{w.title}</h4>
                          <p className="text-xs text-slate-500">
                            {w.platform} - Vez de: {w.whose_turn}
                          </p>
                        </div>
                        {w.status === "assistindo" && (
                          <div className="text-xs text-right">
                            <p className="font-bold">{w.current_episode}/{w.total_episodes || "?"}</p>
                            <button
                              onClick={() => handleWatchEpisode(w.id)}
                              className="text-red-600 font-bold text-[10px]"
                            >
                              +Ep
                            </button>
                          </div>
                        )}
                        {w.status === "assistido" && (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ========== FORM COMPONENTS ==========

function RewardForm({ onSave, onCancel, initial }: { onSave: (data: any) => void; onCancel: () => void; initial?: any }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [cost, setCost] = useState(initial?.cost || 100);
  const [emoji, setEmoji] = useState(initial?.emoji || "🌶️");

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Titulo da recompensa"
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm mb-2"
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Descricao"
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm mb-2"
      />
      <div className="flex gap-2 mb-2">
        <input
          type="number"
          value={cost}
          onChange={e => setCost(parseInt(e.target.value))}
          placeholder="Custo"
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm"
        />
        <input
          value={emoji}
          onChange={e => setEmoji(e.target.value)}
          placeholder="Emoji"
          className="w-16 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm text-center"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 bg-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
        <button onClick={() => onSave({ title, description, cost, emoji })} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-bold">Salvar</button>
      </div>
    </div>
  );
}

function QuestForm({ onSave, onCancel }: { onSave: (data: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bonusXp, setBonusXp] = useState(100);
  const [bonusCoins, setBonusCoins] = useState(200);

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Titulo da missao"
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm mb-2"
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Descricao"
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm mb-2"
      />
      <div className="flex gap-2 mb-2">
        <input
          type="number"
          value={bonusXp}
          onChange={e => setBonusXp(parseInt(e.target.value))}
          placeholder="Bonus XP"
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm"
        />
        <input
          type="number"
          value={bonusCoins}
          onChange={e => setBonusCoins(parseInt(e.target.value))}
          placeholder="Bonus Moedas"
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 bg-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
        <button onClick={() => onSave({ title, description, bonus_xp: bonusXp, bonus_coins: bonusCoins })} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-bold">Salvar</button>
      </div>
    </div>
  );
}

function DateOptionForm({ onSave, onCancel }: { onSave: (data: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("restaurante");
  const [emoji, setEmoji] = useState("💖");

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Titulo do encontro"
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm mb-2"
      />
      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm mb-2"
      >
        <option value="restaurante">Restaurante</option>
        <option value="filme">Filme</option>
        <option value="passeio">Passeio</option>
        <option value="em_casa">Em Casa</option>
        <option value="aventura">Aventura</option>
        <option value="outro">Outro</option>
      </select>
      <input
        value={emoji}
        onChange={e => setEmoji(e.target.value)}
        placeholder="Emoji"
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm mb-2 text-center"
      />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 bg-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
        <button onClick={() => onSave({ title, category, emoji })} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-bold">Salvar</button>
      </div>
    </div>
  );
}

function WatchlistForm({ onSave, onCancel }: { onSave: (data: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("filme");
  const [platform, setPlatform] = useState("");

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Titulo"
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm mb-2"
      />
      <select
        value={type}
        onChange={e => setType(e.target.value)}
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm mb-2"
      >
        <option value="filme">Filme</option>
        <option value="serie">Serie</option>
        <option value="documentario">Documentario</option>
        <option value="anime">Anime</option>
        <option value="outro">Outro</option>
      </select>
      <input
        value={platform}
        onChange={e => setPlatform(e.target.value)}
        placeholder="Plataforma (Netflix, Prime, etc)"
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-2 text-sm mb-2"
      />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 bg-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
        <button onClick={() => onSave({ title, type, platform })} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-bold">Salvar</button>
      </div>
    </div>
  );
}
