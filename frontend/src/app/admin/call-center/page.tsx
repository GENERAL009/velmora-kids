"use client";

import React, { useState } from "react";
import { Search, Phone, Clock, User, Plus, X, Edit2 } from "lucide-react";
import { useAdminLeads, type CRMLead } from "@/hooks/use-admin";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPatch } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  new: "Yangi",
  contacted: "Bog'lanildi",
  qualified: "Malakali",
  proposal: "Taklif",
  negotiation: "Muzokara",
  won: "Yopilgan",
  lost: "Yo'qotilgan",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  qualified: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  proposal: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  negotiation: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  won: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-500",
  medium: "text-amber-500",
  low: "text-green-500",
};

export default function CallCenterPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editLead, setEditLead] = useState<CRMLead | null>(null);
  const [error, setError] = useState("");

  const [createForm, setCreateForm] = useState({ customer_name: "", customer_phone: "", source: "phone", message: "", priority: "medium" });
  const [editForm, setEditForm] = useState({ status: "", priority: "", notes: "" });

  const { data, isLoading } = useAdminLeads({ page, page_size: 20, lead_status: statusFilter !== "all" ? statusFilter : undefined });
  const leads = data?.items ?? [];
  const totalPages = data?.pages ?? 1;

  const filtered = leads.filter((l) => !search || l.customer_name?.toLowerCase().includes(search.toLowerCase()) || l.customer_phone?.includes(search));

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/crm/leads", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "leads"] }); setShowCreateModal(false); setCreateForm({ customer_name: "", customer_phone: "", source: "phone", message: "", priority: "medium" }); setError(""); },
    onError: (err: any) => setError(err?.response?.data?.detail || "Xatolik"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiPatch(`/crm/leads/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "leads"] }); setEditLead(null); setError(""); },
    onError: (err: any) => setError(err?.response?.data?.detail || "Xatolik"),
  });

  const handleCreate = () => {
    if (!createForm.customer_name || !createForm.customer_phone) { setError("Ism va telefon majburiy"); return; }
    createMutation.mutate({ ...createForm, message: createForm.message || undefined });
  };

  const handleUpdate = () => {
    if (!editLead) return;
    updateMutation.mutate({ id: editLead.id, data: { status: editForm.status, priority: editForm.priority, notes: editForm.notes || undefined } });
  };

  const openEdit = (lead: CRMLead) => {
    setEditLead(lead);
    setEditForm({ status: lead.status, priority: lead.priority, notes: lead.notes || "" });
    setError("");
  };

  const inputCls = "w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Koll-markaz</h1>
          <p className="mt-1 text-sm text-neutral-500">Lidlar va qo'ng'iroqlarni boshqarish</p>
        </div>
        <Button variant="default" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setShowCreateModal(true); setError(""); }}>
          Yangi lid
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input type="search" placeholder="Ism yoki telefon bo'yicha qidirish..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-4 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" />
        </div>
        <div className="flex flex-wrap gap-1">
          {["all", "new", "contacted", "qualified", "won", "lost"].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={cn("rounded-lg px-3 py-2 text-xs font-medium transition-colors", statusFilter === s ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300")}>
              {s === "all" ? "Barchasi" : STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="mt-3 h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
          </div>
        ))}
        {filtered.map((lead) => (
          <div key={lead.id} className="rounded-xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                  <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">{lead.customer_name}</p>
                  <a href={`tel:${lead.customer_phone}`} className="flex items-center gap-1 text-sm text-primary-600 hover:underline">
                    <Phone className="h-3.5 w-3.5" />
                    {lead.customer_phone}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", PRIORITY_COLORS[lead.priority] || "text-neutral-400", "bg-current")} title={lead.priority} />
                <button onClick={() => openEdit(lead)} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {lead.notes && <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">{lead.notes}</p>}
            <div className="mt-3 flex items-center justify-between">
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_COLORS[lead.status] || "bg-neutral-100 text-neutral-600")}>
                {STATUS_LABELS[lead.status] || lead.status}
              </span>
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <Clock className="h-3 w-3" />
                {formatDate(lead.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={cn("h-8 w-8 rounded-lg text-sm font-medium", page === i + 1 ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300")}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Yangi lid</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Mijoz ismi *</label>
                <input value={createForm.customer_name} onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Telefon *</label>
                <input value={createForm.customer_phone} onChange={(e) => setCreateForm({ ...createForm, customer_phone: e.target.value })} className={inputCls} placeholder="+998..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Manba</label>
                  <select value={createForm.source} onChange={(e) => setCreateForm({ ...createForm, source: e.target.value })} className={inputCls}>
                    <option value="phone">Telefon</option>
                    <option value="telegram">Telegram</option>
                    <option value="instagram">Instagram</option>
                    <option value="website">Sayt</option>
                    <option value="referral">Tavsiya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Muhimlik</label>
                  <select value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })} className={inputCls}>
                    <option value="low">Past</option>
                    <option value="medium">O'rta</option>
                    <option value="high">Yuqori</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Xabar</label>
                <textarea value={createForm.message} onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })} rows={2} className={inputCls + " resize-none"} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Bekor qilish</Button>
              <Button variant="default" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Yaratilmoqda..." : "Yaratish"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditLead(null)}>
          <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Tahrirlash: {editLead.customer_name}</h2>
              <button onClick={() => setEditLead(null)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Holat</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className={inputCls}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Muhimlik</label>
                  <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className={inputCls}>
                    <option value="low">Past</option>
                    <option value="medium">O'rta</option>
                    <option value="high">Yuqori</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Izohlar</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className={inputCls + " resize-none"} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setEditLead(null)}>Bekor qilish</Button>
              <Button variant="default" onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
