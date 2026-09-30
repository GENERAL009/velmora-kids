"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  Shield,
  ShieldCheck,
  Headphones,
  ShoppingBag,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { AxiosError } from "axios";

interface StaffUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface UserFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  is_active: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  director: "Direktor",
  seller: "Sotuvchi",
  call_center: "Call markaz",
  customer: "Mijoz",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  director: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  seller: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  call_center: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  customer: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
};

const ROLE_FILTERS = [
  { value: "all", label: "Barchasi", icon: Shield },
  { value: "super_admin", label: "Adminlar", icon: ShieldCheck },
  { value: "director", label: "Direktorlar", icon: ShieldCheck },
  { value: "seller", label: "Sotuvchilar", icon: ShoppingBag },
  { value: "call_center", label: "Call markaz", icon: Headphones },
];

const ASSIGNABLE_ROLES = [
  { value: "super_admin", label: "Super admin" },
  { value: "director", label: "Direktor" },
  { value: "seller", label: "Sotuvchi" },
  { value: "call_center", label: "Call markaz" },
];

const emptyForm: UserFormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  password: "",
  role: "seller",
  is_active: true,
};

function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail.map((e: { msg?: string }) => e.msg || "").join(", ");
    }
    if (typeof data?.message === "string") return data.message;
  }
  return "Xatolik yuz berdi. Qayta urinib ko'ring.";
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<StaffUser | null>(null);

  // Form state
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiGet<StaffUser[]>("/users"),
  });

  // Auto-clear success message
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // === Mutations ===

  const createMutation = useMutation({
    mutationFn: (data: Partial<UserFormData>) => apiPost<StaffUser>("/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setShowAddModal(false);
      setFormData(emptyForm);
      setFormError(null);
      setSuccessMsg("Xodim muvaffaqiyatli yaratildi");
    },
    onError: (err) => setFormError(getApiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiPatch<StaffUser>(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setEditingUser(null);
      setFormData(emptyForm);
      setFormError(null);
      setSuccessMsg("Xodim ma'lumotlari yangilandi");
    },
    onError: (err) => setFormError(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setDeletingUser(null);
      setSuccessMsg("Xodim o'chirildi");
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/users/${id}`, { is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setSuccessMsg("Xodim faollashtirildi");
    },
  });

  // === Handlers ===

  function openAddModal() {
    setFormData(emptyForm);
    setFormError(null);
    setShowAddModal(true);
  }

  function openEditModal(user: StaffUser) {
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      role: user.role,
      is_active: user.is_active,
    });
    setFormError(null);
    setEditingUser(user);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (formData.password.length < 8) {
      setFormError("Parol kamida 8 belgidan iborat bo'lishi kerak");
      return;
    }
    const payload: Record<string, unknown> = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
    };
    if (formData.phone.trim()) payload.phone = formData.phone.trim();
    createMutation.mutate(payload as Partial<UserFormData>);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setFormError(null);

    const changed: Record<string, unknown> = {};
    if (formData.first_name !== editingUser.first_name) changed.first_name = formData.first_name;
    if (formData.last_name !== editingUser.last_name) changed.last_name = formData.last_name;
    if (formData.email !== editingUser.email) changed.email = formData.email;
    if (formData.phone !== (editingUser.phone || "")) changed.phone = formData.phone || null;
    if (formData.role !== editingUser.role) changed.role = formData.role;
    if (formData.is_active !== editingUser.is_active) changed.is_active = formData.is_active;
    if (formData.password.trim()) {
      if (formData.password.length < 8) {
        setFormError("Parol kamida 8 belgidan iborat bo'lishi kerak");
        return;
      }
      changed.password = formData.password;
    }

    if (Object.keys(changed).length === 0) {
      setEditingUser(null);
      return;
    }

    updateMutation.mutate({ id: editingUser.id, data: changed });
  }

  function handleInputChange(field: keyof UserFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // === Filter ===

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isCurrentUser = (userId: string) => currentUser?.id === userId;

  // === Form fields renderer ===

  function renderFormFields(mode: "create" | "edit") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Ism *
            </label>
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => handleInputChange("first_name", e.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Familiya *
            </label>
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => handleInputChange("last_name", e.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Telefon
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            placeholder="+998 90 123 45 67"
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {mode === "edit" ? "Yangi parol (bo'sh qoldiring)" : "Parol *"}
          </label>
          <input
            type="password"
            required={mode === "create"}
            minLength={mode === "create" ? 8 : undefined}
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            placeholder={mode === "edit" ? "O'zgartirmaslik uchun bo'sh qoldiring" : "Kamida 8 belgi"}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Rol
          </label>
          <select
            value={formData.role}
            onChange={(e) => handleInputChange("role", e.target.value)}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {mode === "edit" && (
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Faol
            </label>
            <button
              type="button"
              onClick={() => handleInputChange("is_active", !formData.is_active)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                formData.is_active ? "bg-green-500" : "bg-neutral-300 dark:bg-neutral-600"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                  formData.is_active ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success toast */}
      {successMsg && (
        <div className="fixed right-4 top-4 z-[60] flex items-center gap-2 rounded-lg bg-green-500 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <CheckCircle className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Foydalanuvchilar</h1>
          <p className="mt-1 text-sm text-neutral-500">{users.length} xodim</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <UserPlus className="h-4 w-4" />
          {"Xodim qo'shish"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Ism yoki email bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-4 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div className="flex gap-1">
          {ROLE_FILTERS.map((rf) => (
            <button
              key={rf.value}
              onClick={() => setRoleFilter(rf.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                roleFilter === rf.value
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              )}
            >
              {rf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Xodim</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Email</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Telefon</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Rol</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Holat</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-300">Sana</th>
              <th className="px-4 py-3 text-right font-medium text-neutral-600 dark:text-neutral-300">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-4">
                    <div className="h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </td>
                </tr>
              ))}
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                      {user.first_name[0]}
                      {user.last_name[0]}
                    </div>
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {user.first_name} {user.last_name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{user.email}</td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {user.phone || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      ROLE_COLORS[user.role] || ROLE_COLORS.customer
                    )}
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      user.is_active
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}
                  >
                    {user.is_active ? "Faol" : "O'chirilgan"}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Activate button for deactivated users */}
                    {!user.is_active && !isCurrentUser(user.id) && (
                      <button
                        onClick={() => activateMutation.mutate(user.id)}
                        disabled={activateMutation.isPending}
                        title="Faollashtirish"
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                      >
                        Faollashtirish
                      </button>
                    )}
                    {/* Edit button */}
                    <button
                      onClick={() => openEditModal(user)}
                      title="Tahrirlash"
                      className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {/* Delete button (not for self) */}
                    {!isCurrentUser(user.id) && (
                      <button
                        onClick={() => setDeletingUser(user)}
                        title="O'chirish"
                        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                  Foydalanuvchilar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ============ ADD USER MODAL ============ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {"Xodim qo'shish"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormError(null);
                }}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <XCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit}>
              {renderFormFields("create")}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError(null);
                  }}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Yaratilmoqda..." : "Yaratish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ EDIT USER MODAL ============ */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Xodimni tahrirlash
              </h2>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setFormError(null);
                }}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <XCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              {renderFormFields("edit")}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setFormError(null);
                  }}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRMATION MODAL ============ */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-elevated">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {"Xodimni o'chirish"}
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {"Foydalanuvchini o'chirmoqchimisiz?"}{" "}
              <strong>
                {deletingUser.first_name} {deletingUser.last_name}
              </strong>
              ?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingUser.id)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
