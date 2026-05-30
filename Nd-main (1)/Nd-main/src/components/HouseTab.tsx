import React, { useState } from "react";
import { Plus, Trash2, FileText, Phone, Copy, Calendar, CircleCheck as CheckCircle, Wrench, TriangleAlert as AlertTriangle, ExternalLink, DollarSign, RefreshCw, ShieldCheck, CreditCard } from "lucide-react";

interface HouseDocument {
  id: string;
  title: string;
  category: "Aluguel" | "Contas" | "Plantas/Manual" | "Seguro" | "Outro";
  link: string;
  date_added: string;
}

interface MaintenanceAlert {
  id: string;
  title: string;
  category: "Limpeza" | "Elétrica" | "Hidráulica" | "Eletrodomésticos" | "Outro";
  due_date: string;
  status: "pending" | "completed";
  completed_at?: string;
  points: number;
}

interface ImportantContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
}

interface FixedBill {
  id: string;
  name: string;
  value: string;
  due_date: string;
  is_paid: boolean;
  paid_by?: string;
  paid_at?: string;
}

interface FixedFunction {
  id: string;
  title: string;
  responsible_id: string; // "Leandro" | "Kaisa" | "Ambos"
  tracker: boolean[]; // 7 days array (Dom, Seg, Ter, Qua, Qui, Sex, Sab)
}

interface HouseTabProps {
  houseDocuments: HouseDocument[];
  houseMaintenances: MaintenanceAlert[];
  houseContacts: ImportantContact[];
  fixedBills: FixedBill[];
  fixedFunctions: FixedFunction[];
  currentUser: string;
  partnerUser: any;
  triggerCustomNotify: (msg: string, type: "success" | "error" | "info") => void;
  triggerCustomConfirm: (msg: string, action: () => void) => void;
  onRefresh: () => void;
  onlyShowBills?: boolean;
}

// Default/mock values if state is completely empty
const FALLBACK_CONTACTS = [
  { id: "fc1", name: "Sr. João (Encanador)", role: "Hidráulica e Reparos urgentes", phone: "(11) 98888-7777" },
  { id: "fc2", name: "Dra. Ana (Clínica Vets)", role: "Veterinária 24h", phone: "(11) 3222-1111" }
];

const FALLBACK_MAINTENANCE = [
  { id: "fm1", title: "Limpar o filtro do Ar Condicionado", category: "Eletrodomésticos", due_date: "2026-06-15", status: "pending", points: 15 },
  { id: "fm2", title: "Dedetização do apartamento", category: "Limpeza", due_date: "2026-06-30", status: "pending", points: 30 }
];

export default function HouseTab({ 
  houseDocuments,
  houseMaintenances,
  houseContacts,
  fixedBills,
  fixedFunctions,
  currentUser,
  partnerUser,
  triggerCustomNotify,
  triggerCustomConfirm,
  onRefresh,
  onlyShowBills = false
}: HouseTabProps) {
  // Input triggers and drafts states
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isAddingMaint, setIsAddingMaint] = useState(false);
  const [isAddingBill, setIsAddingBill] = useState(false);

  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState<any>("Contas");
  const [docLink, setDocLink] = useState("");

  const [maintTitle, setMaintTitle] = useState("");
  const [maintCategory, setMaintCategory] = useState<any>("Limpeza");
  const [maintDueDate, setMaintDueDate] = useState("");

  const [contName, setContName] = useState("");
  const [contRole, setContRole] = useState("");
  const [contPhone, setContPhone] = useState("");
  const [contEmail, setContEmail] = useState("");

  const [billName, setBillName] = useState("");
  const [billValue, setBillValue] = useState("");
  const [billDueDate, setBillDueDate] = useState("");

  const handlePostHouse = async (type: "document" | "maintenance" | "contact" | "fixedBill", data: any) => {
    try {
      const res = await fetch("/api/house/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data })
      });
      if (res.ok) {
        onRefresh();
        triggerCustomNotify("Item adicionado e sincronizado com o parceiro!", "success");
      } else {
        triggerCustomNotify("Erro ao registrar no servidor", "error");
      }
    } catch (err) {
      triggerCustomNotify("Erro de conexão", "error");
    }
  };

  const handleDeleteHouse = async (type: "document" | "maintenance" | "contact" | "fixedBill", id: string) => {
    try {
      const res = await fetch("/api/house/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id })
      });
      if (res.ok) {
        onRefresh();
        triggerCustomNotify("Item removido do lar!", "info");
      }
    } catch (err) {
      triggerCustomNotify("Erro de conexão", "error");
    }
  };

  const handlePayBill = async (billId: string) => {
    try {
      const res = await fetch("/api/house/pay-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: billId, paid_by_id: currentUser })
      });
      if (res.ok) {
        onRefresh();
        triggerCustomNotify("Conta paga! Lançamento gerado em finanças automaticamente. 💰", "success");
      }
    } catch (err) {
      triggerCustomNotify("Erro ao efetuar o pagamento", "error");
    }
  };

  const handleResetBills = () => {
    triggerCustomConfirm("Deseja marcar todas as contas fixas como NÃO PAGAS para iniciar um novo mês?", async () => {
      try {
        const res = await fetch("/api/house/reset-bills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
        if (res.ok) {
          onRefresh();
          triggerCustomNotify("Mesada reiniciada! Contas prontas para novos pagamentos. 🔄", "success");
        }
      } catch (err) {
        triggerCustomNotify("Erro ao reiniciar contas", "error");
      }
    });
  };

  // Submit handlers
  const onAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    handlePostHouse("document", {
      title: docTitle,
      category: docCategory,
      link: docLink || "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format",
      date_added: new Date().toISOString().split("T")[0]
    });
    setDocTitle("");
    setDocLink("");
    setIsAddingDoc(false);
  };

  const onAddMaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintTitle.trim()) return;
    handlePostHouse("maintenance", {
      title: maintTitle,
      category: maintCategory,
      due_date: maintDueDate || new Date().toISOString().split("T")[0],
      status: "pending",
      points: maintCategory === "Urgente" ? 30 : 15
    });
    setMaintTitle("");
    setMaintDueDate("");
    setIsAddingMaint(false);
  };

  const onAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contName.trim() || !contPhone.trim()) return;
    handlePostHouse("contact", {
      name: contName,
      role: contRole,
      phone: contPhone,
      email: contEmail || undefined
    });
    setContName("");
    setContRole("");
    setContPhone("");
    setContEmail("");
    setIsAddingContact(false);
  };

  const onAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billName.trim() || !billValue.trim()) return;
    handlePostHouse("fixedBill", {
      name: billName,
      value: billValue,
      due_date: billDueDate || new Date().toISOString().split("T")[0],
      is_paid: false
    });
    setBillName("");
    setBillValue("");
    setBillDueDate("");
    setIsAddingBill(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerCustomNotify("Copiado com sucesso! 📋", "success");
  };

  const docsToDisplay = houseDocuments;
  const maintenanceToDisplay = houseMaintenances.length > 0 ? houseMaintenances : FALLBACK_MAINTENANCE;
  const contactsToDisplay = houseContacts.length > 0 ? houseContacts : FALLBACK_CONTACTS;

  if (onlyShowBills) {
    return (
      <div className="flex-1 flex flex-col gap-4 animate-fade-in text-slate-800 dark:text-slate-100" id="house-bills-only">
        {/* Module 1: Contas Fixas (Full Width) */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-3xl p-5 flex flex-col gap-3 shadow-md" id="card-contas-fixas">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-rose-700 flex items-center gap-1.5 font-display">
              <DollarSign className="w-4 h-4 text-rose-500" /> Contas Fixas do Mês
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetBills}
                className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                title="Reiniciar contas para novo mês"
              >
                <RefreshCw className="w-3 h-3" /> Reiniciar Mês
              </button>
              <button
                type="button"
                onClick={() => setIsAddingBill(!isAddingBill)}
                className="text-rose-750 font-bold text-xs hover:underline flex items-center gap-0.5"
              >
                {isAddingBill ? "Fechar" : "+ Conta"}
              </button>
            </div>
          </div>

          {/* Add Bill Form */}
          {isAddingBill && (
            <form onSubmit={onAddBill} className="bg-rose-50/50 p-3 rounded-2xl border border-rose-200/50 flex flex-col gap-2 animate-fade-in">
              <input
                type="text"
                placeholder="Nome da Conta (Ex: Aluguel, Internet)"
                value={billName}
                onChange={e => setBillName(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs text-slate-905 placeholder:text-slate-400"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor (R$)"
                  value={billValue}
                  onChange={e => setBillValue(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs text-slate-905 placeholder:text-slate-400"
                  required
                />
                <input
                  type="date"
                  value={billDueDate}
                  onChange={e => setBillDueDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs text-slate-905"
                />
              </div>
              <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-1.5 rounded-xl transition">
                Adicionar Conta Fixa
              </button>
            </form>
          )}

          {/* Bills list */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px]">
            {fixedBills.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-rose-150 rounded-2xl bg-white dark:bg-slate-800">
                <p className="text-xs text-slate-400 italic">Nenhuma conta fixa mensal adicionada no sistema.</p>
                <button 
                  type="button"
                  onClick={() => setIsAddingBill(true)}
                  className="mt-2 text-[10px] bg-rose-500 hover:bg-rose-600 text-white font-bold px-2.5 py-1 rounded-lg"
                >
                  Adicionar Primeira Conta
                </button>
              </div>
            ) : (
              <>
              {fixedBills.map(bill => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const dueDate = new Date(bill.due_date);
                dueDate.setHours(23,59,59,999);
                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let urgencyTag = null;
                if (!bill.is_paid) {
                  if (diffDays < 0) {
                    urgencyTag = <span className="text-[9px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">🚨 Vencida</span>;
                  } else if (diffDays <= 3) {
                    urgencyTag = <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">⚠️ Vence em breve</span>;
                  }
                }

                return (
                  <div key={bill.id} className={`p-3 rounded-2xl text-xs border transition ${
                    bill.is_paid 
                      ? "bg-emerald-50/50 border-emerald-100 text-slate-600 dark:text-slate-300" 
                      : "bg-white dark:bg-slate-800 border-slate-200 text-slate-800 dark:text-slate-100 shadow-sm"
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold flex items-center gap-1.5 text-slate-850">
                          {bill.name} 
                          {bill.is_paid && <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Pago</span>}
                          {urgencyTag}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">Vence dia {dueDate.toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-950 font-mono">R$ {parseFloat(bill.value).toFixed(2)}</p>
                        <button 
                          type="button"
                          onClick={() => handleDeleteHouse("fixedBill", bill.id)} 
                          className="text-slate-300 hover:text-rose-500 transition ml-2 inline-block pt-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Payment controls */}
                    <div className="mt-2.5 border-t border-slate-100 dark:border-slate-700 pt-2 flex items-center justify-between gap-1">
                      {bill.is_paid ? (
                        <>
                          <span className="text-[9px] text-emerald-600 font-medium flex items-center gap-0.5">
                            <CreditCard className="w-3 h-3" /> Pago por {bill.paid_by === "Leandro" ? "Leandro" : "Kaisa"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePayBill(bill.id)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold px-2 py-1 rounded-lg text-[9px] transition"
                          >
                            Desfazer
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Aguardando Pagamento
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePayBill(bill.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition"
                          >
                            Paguei!
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-400">Total Fixo do Mês:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  R$ {fixedBills.reduce((acc, curr) => acc + parseFloat(curr.value || '0'), 0).toFixed(2)}
                </span>
              </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 animate-fade-in text-slate-800 dark:text-slate-100" id="house-tab-root">
      
      {/* Tab Header */}
      <div className="border-b border-rose-100 pb-3" id="house-header">
        <h2 className="font-bold text-slate-950 text-base font-display flex items-center gap-1.5">
          <span>🏡</span> Organização do Lar & Contas Compartilhadas
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Documentação do imóvel, manutenções preventivas e agenda rápida de contatos. 🛠️🏡</p>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" id="house-workspace-grid">
        
        {/* Module 2: Maintenance Alerts (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-3xl p-5 flex flex-col gap-3 shadow-md" id="card-manutencoes">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-705 flex items-center gap-1.5 font-display">
              <Wrench className="w-4 h-4 text-amber-500" /> Manutenções do Lar
            </h3>
            <button
              onClick={() => setIsAddingMaint(!isAddingMaint)}
              className="text-amber-600 font-bold text-xs hover:underline flex items-center gap-0.5"
            >
              {isAddingMaint ? "Fechar" : "+ Agendar"}
            </button>
          </div>

          {isAddingMaint && (
            <form onSubmit={onAddMaint} className="bg-slate-50/50 p-2.5 rounded-2xl border border-amber-200/50 flex flex-col gap-1.5 animate-fade-in">
              <input
                type="text"
                placeholder="Tarefa (Ex: Limpar AC)"
                value={maintTitle}
                onChange={e => setMaintTitle(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-1 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400"
                required
              />
              <div className="grid grid-cols-2 gap-1">
                <select
                  value={maintCategory}
                  onChange={e => setMaintCategory(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-1.5 py-1 text-xs text-slate-800 dark:text-slate-100"
                >
                  <option value="Limpeza">Limpeza</option>
                  <option value="Elétrica">Elétrica</option>
                  <option value="Hidráulica">Hidráulica</option>
                  <option value="Eletrodomésticos">Eletros</option>
                  <option value="Outro">Outro</option>
                </select>
                <input
                  type="date"
                  value={maintDueDate}
                  onChange={e => setMaintDueDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-1.5 py-1 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
              <button type="submit" className="w-full bg-amber-550 hover:bg-amber-600 text-white font-bold text-[10px] py-1.5 rounded-xl transition">
                Agendar Manutenção
              </button>
            </form>
          )}

          {/* Maintenance list */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px]">
            {maintenanceToDisplay.map(m => (
              <div key={m.id} className="p-2.5 rounded-2xl bg-slate-50/50 text-xs border border-slate-100 dark:border-slate-700 relative flex justify-between items-start animate-fade-in">
                <div className="truncate pr-1.5">
                  <h4 className="font-bold text-slate-850 truncate flex items-center gap-1">
                    <span className="truncate">{m.title}</span>
                  </h4>
                  <p className="text-[9px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" /> Prazo: {new Date(m.due_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <button 
                  onClick={() => handleDeleteHouse("maintenance", m.id)} 
                  className="text-slate-300 hover:text-[#ef4444] transition shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Module 3: Contacts Directory and Documents (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-155 dark:border-slate-700 rounded-3xl p-5 flex flex-col gap-3 shadow-md" id="card-agenda-docs">
          {/* Shared contacts */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-display">
                <Phone className="w-4 h-4 text-sky-500" /> Agenda Rápida do Lar
              </h3>
              <button
                onClick={() => setIsAddingContact(!isAddingContact)}
                className="text-sky-600 font-bold text-xs hover:underline"
              >
                {isAddingContact ? "Fechar" : "+ Contato"}
              </button>
            </div>

            {isAddingContact && (
              <form onSubmit={onAddContact} className="bg-slate-50/50 p-2.5 border border-sky-100/50 rounded-2xl flex flex-col gap-1.5 animate-fade-in">
                <input
                  type="text"
                  placeholder="Nome do Contato"
                  value={contName}
                  onChange={e => setContName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-1 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 font-sans"
                  required
                />
                <input
                  type="text"
                  placeholder="Especialidade / Role"
                  value={contRole}
                  onChange={e => setContRole(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-1 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 font-sans"
                />
                <input
                  type="text"
                  placeholder="WhatsApp / Fone"
                  value={contPhone}
                  onChange={e => setContPhone(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-1 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 font-sans"
                  required
                />
                <button type="submit" className="w-full bg-sky-600 text-white font-bold text-[10px] py-1.5 rounded-xl">
                  Salvar Contato 📞
                </button>
              </form>
            )}

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[140px]">
              {contactsToDisplay.map(c => (
                <div key={c.id} className="p-2 bg-slate-50/50 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col gap-1 text-[11px] animate-fade-in">
                  <div className="flex justify-between items-start">
                    <div className="truncate">
                      <span className="font-bold text-slate-800 dark:text-slate-100 block truncate">{c.name}</span>
                      <span className="text-[9px] text-slate-400 truncate block">{c.role}</span>
                    </div>
                    <button onClick={() => handleDeleteHouse("contact", c.id)} className="text-slate-300 hover:text-[#ef4444] transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-100 dark:border-slate-700 mt-1">
                    <span className="font-mono font-bold text-slate-700 text-[10px] pr-1.5">{c.phone}</span>
                    <button onClick={() => copyToClipboard(c.phone)} className="text-slate-400 hover:text-sky-600">
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secure vault / Documents */}
          <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-display">
                <FileText className="w-4 h-4 text-emerald-600" /> Cofre de Docs
              </h3>
              <button
                onClick={() => setIsAddingDoc(!isAddingDoc)}
                className="text-emerald-600 font-bold text-xs hover:underline"
              >
                {isAddingDoc ? "Fechar" : "+ Enviar"}
              </button>
            </div>

            {isAddingDoc && (
              <form onSubmit={onAddDoc} className="bg-slate-50/50 p-2.5 border border-emerald-100/50 rounded-2xl flex flex-col gap-1.5 animate-fade-in">
                <input
                  type="text"
                  placeholder="Nome do Documento"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-1 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 font-sans"
                  required
                />
                <select
                  value={docCategory}
                  onChange={e => setDocCategory(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-1 text-xs text-slate-805"
                >
                  <option value="Aluguel">Aluguel</option>
                  <option value="Contas">Contas</option>
                  <option value="Plantas/Manual">Planta / Manual</option>
                  <option value="Outro">Outro</option>
                </select>
                <input
                  type="text"
                  placeholder="URL do PDF (Simulado)"
                  value={docLink}
                  onChange={e => setDocLink(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-1 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 font-sans"
                />
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold text-[10px] py-1.5 rounded-xl">
                  Salvar Documento 📂
                </button>
              </form>
            )}

            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[140px]">
              {docsToDisplay.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">Cofre seguro sem documentos anexados.</p>
              ) : (
                docsToDisplay.map(doc => (
                  <div key={doc.id} className="p-2 bg-slate-50/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center text-[11px] animate-fade-in">
                    <div className="truncate flex-1">
                      <a href={doc.link} target="_blank" rel="noreferrer" className="font-bold text-sky-600 hover:underline flex items-center gap-1">
                        <span className="truncate">{doc.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </div>
                    <button 
                      onClick={() => handleDeleteHouse("document", doc.id)}
                      className="text-slate-300 hover:text-red-500 pl-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Module 4: Rotina do Lar (Tracker de 7 dias) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-3xl p-5 flex flex-col gap-3 shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-violet-700 flex items-center gap-1.5 font-display">
            <CheckCircle className="w-4 h-4 text-violet-500" /> Rotina do Lar (Tracker Semanal)
          </h3>
          <button
            onClick={() => triggerCustomNotify("A edição da Rotina será implementada em breve! 🔄", "info")}
            className="text-violet-600 font-bold text-xs hover:underline flex items-center gap-0.5"
          >
            + Função
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {fixedFunctions.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-violet-100 rounded-2xl bg-white dark:bg-slate-800">
              <p className="text-xs text-slate-400 italic">Nenhuma função semanal adicionada.</p>
            </div>
          ) : (
            fixedFunctions.map((fn, index) => (
              <div key={fn.id || index} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">{fn.title}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Responsável: <span className="text-violet-600">{fn.responsible_id}</span></p>
                </div>
                <div className="flex items-center gap-1">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((day, dIdx) => (
                    <button
                      key={dIdx}
                      className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[9px] transition ${
                        fn.tracker && fn.tracker[dIdx] 
                          ? "bg-violet-600 text-white shadow-sm" 
                          : "bg-white border border-slate-200 text-slate-400 hover:border-violet-400"
                      }`}
                      onClick={() => triggerCustomNotify("Edição de status diário da rotina fixa! 🔄", "info")}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
