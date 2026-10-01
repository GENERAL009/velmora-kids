"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo } from "react";
import { Search, Download, Plus, Phone, MessageSquare, User, X, Edit } from "lucide-react";
import { DataTable, Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/stat-card";
import { formatDate } from "@/lib/utils";
import { useAdminLeads, type CRMLead } from "@/hooks/use-admin";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPatch } from "@/lib/api";

export default function CRMPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLead, setEditingLead] = useState<CRMLead | null>(null);
  const [createForm, setCreateForm] = useState({ customer_name: "", customer_phone: "", source: "website", message: "", priority: "medium" });
  const [editForm, setEditForm] = useState({ status: "", priority: "", notes: "" });
  const [error, setError] = useState("");

  const { data, isLoading } = useAdminLeads({
    page: currentPage, page_size: pageSize,
    lead_status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/crm/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      setShowCreateModal(false);
      setCreateForm({ customer_name: "", customer_phone: "", source: "website", message: "", priority: "medium" });
      setError("");
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Xatolik"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiPatch(`/crm/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      setEditingLead(null);
      setError("");
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Xatolik"),
  });

  const handleCreate = () => {
    if (!createForm.customer_name || !createForm.customer_phone) { setError("Ism va telefon majburiy"); return; }
    createMutation.mutate({
      customer_name: createForm.customer_name,
      customer_phone: createForm.customer_phone,
      source: createForm.source,
      message: createForm.message || undefined,
      priority: createForm.priority,
    });
  };

  const handleUpdate = () => {
    if (!editingLead) return;
    const data: Record<string, unknown> = {};
    if (editForm.status) data.status = editForm.status;
    if (editForm.priority) data.priority = editForm.priority;
    if (editForm.notes) data.notes = editForm.notes;
    updateMutation.mutate({ id: editingLead.id, data });
  };

  const openEdit = (lead: CRMLead) => {
    setEditingLead(lead);
    setEditForm({ status: lead.status, priority: lead.priority, notes: lead.notes || "" });
    setError("");
  };

  const allLeads = data?.items ?? [];
  const totalPages = data?.pages ?? 1;
  const totalFromApi = data?.total ?? 0;

  const filteredLeads = useMemo(() => {
    return allLeads.filter((lead) => {
      const matchesSearch = !searchQuery ||
        lead.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.customer_phone?.includes(searchQuery);
      const matchesPriority = priorityFilter === "all" || lead.priority === priorityFilter;
      const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
      return matchesSearch && matchesPriority && matchesSource;
    });
  }, [allLeads, searchQuery, priorityFilter, sourceFilter]);

  const sources = useMemo(() => Array.from(new Set(allLeads.map((l) => l.source).filter(Boolean))), [allLeads]);
  const newLeads = allLeads.filter((l) => l.status === "new" || l.status === "lead").length;
  const inProgress = allLeads.filter((l) => ["contacted", "qualified", "in_progress"].includes(l.status)).length;

  const columns: Column<CRMLead>[] = [
    {
      key: "customer_name", label: "Mijoz", sortable: true,
      render: (lead) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary-100 dark:bg-secondary-900/20 flex items-center justify-center text-secondary-600 dark:text-secondary-400 font-semibold">
            {(lead.customer_name || "?").charAt(0)}
          </div>
          <div>
            <p className="font-medium">{lead.customer_name || "—"}</p>
            <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <Phone className="w-3 h-3" /><span>{lead.customer_phone || "—"}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: "source", label: "Manba", sortable: true, render: (lead) => <span className="text-sm px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded">{lead.source || "—"}</span> },
    { key: "notes", label: "Izohlar", render: (lead) => <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-2 max-w-xs">{lead.notes || "—"}</p> },
    { key: "priority", label: "Muhimlik", sortable: true, render: (lead) => <StatusBadge status={lead.priority || "medium"} /> },
    {
      key: "assigned_to", label: "Menejer", sortable: true,
      render: (lead) => <span className="text-sm">{lead.assigned_to ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}` : "—"}</span>,
    },
    { key: "status", label: "Holat", sortable: true, render: (lead) => <StatusBadge status={lead.status} /> },
    {
      key: "created_at", label: "Sana", sortable: true,
      render: (lead) => <span className="text-sm text-neutral-500">{formatDate(lead.created_at, { month: "short", day: "numeric" })}</span>,
    },
    {
      key: "actions", label: "",
      render: (lead) => (
        <button onClick={(e) => { e.stopPropagation(); openEdit(lead); }} className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
          <Edit className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const inputCls = "w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">CRM</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Lidlar va arizalarni boshqarish</p>
        </div>
        <Button variant="default" leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setShowCreateModal(true); setError(""); }}>
          Lid yaratish
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Yangi lidlar" value={isLoading ? "..." : newLeads.toString()} icon={MessageSquare} />
        <StatCard title="Jarayonda" value={isLoading ? "..." : inProgress.toString()} icon={Phone} />
        <StatCard title="Jami" value={isLoading ? "..." : totalFromApi.toString()} icon={User} />
        <StatCard title="Manbalar" value={isLoading ? "..." : sources.length.toString()} icon={MessageSquare} />
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input type="search" placeholder="Qidirish..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className={inputCls}>
            <option value="all">Barcha holatlar</option>
            <option value="new">Yangi</option><option value="contacted">Bog'lanildi</option>
            <option value="qualified">Malakali</option><option value="converted">Konvertatsiya</option><option value="lost">Yo'qotilgan</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={inputCls}>
            <option value="all">Barcha muhimliklar</option>
            <option value="urgent">Shoshilinch</option><option value="high">Yuqori</option>
            <option value="medium">O'rta</option><option value="low">Past</option>
          </select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={inputCls}>
            <option value="all">Barcha manbalar</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {isLoading ? "Yuklanmoqda..." : <>Topildi: <span className="font-semibold">{filteredLeads.length}</span></>}
        </p>
        <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>Eksport</Button>
      </div>

      <DataTable columns={columns} data={filteredLeads} keyExtractor={(l) => l.id} emptyMessage={isLoading ? "Yuklanmoqda..." : "Lidlar topilmadi"} />

      <div className="flex items-center justify-between bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          Sahifa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Orqaga</Button>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Oldinga</Button>
        </div>
      </div>

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
                <input value={createForm.customer_name} onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })} className={inputCls} placeholder="Ism Familiya" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Telefon *</label>
                <input value={createForm.customer_phone} onChange={(e) => setCreateForm({ ...createForm, customer_phone: e.target.value })} className={inputCls} placeholder="+998 90 123 45 67" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Manba</label>
                  <select value={createForm.source} onChange={(e) => setCreateForm({ ...createForm, source: e.target.value })} className={inputCls}>
                    <option value="website">Sayt</option><option value="telegram">Telegram</option>
                    <option value="instagram">Instagram</option><option value="phone">Qo'ng'iroq</option>
                    <option value="referral">Tavsiya</option><option value="other">Boshqa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Muhimlik</label>
                  <select value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })} className={inputCls}>
                    <option value="low">Past</option><option value="medium">O'rta</option>
                    <option value="high">Yuqori</option><option value="urgent">Shoshilinch</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Xabar</label>
                <textarea value={createForm.message} onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })} rows={3} className={inputCls + " resize-none"} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Bekor qilish</Button>
              <Button variant="default" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saqlanmoqda..." : "Yaratish"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingLead(null)}>
          <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Lidni tahrirlash</h2>
              <button onClick={() => setEditingLead(null)} className="p-1 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <p className="font-medium text-neutral-900 dark:text-white">{editingLead.customer_name}</p>
              <p className="text-sm text-neutral-500">{editingLead.customer_phone}</p>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Holat</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className={inputCls}>
                    <option value="new">Yangi</option><option value="contacted">Bog'lanildi</option>
                    <option value="qualified">Malakali</option><option value="converted">Konvertatsiya</option>
                    <option value="lost">Yo'qotilgan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Muhimlik</label>
                  <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className={inputCls}>
                    <option value="low">Past</option><option value="medium">O'rta</option>
                    <option value="high">Yuqori</option><option value="urgent">Shoshilinch</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Izohlar</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className={inputCls + " resize-none"} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setEditingLead(null)}>Bekor qilish</Button>
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
