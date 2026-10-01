"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Search, Download, Package, Edit, Trash2 } from "lucide-react";
import { DataTable, Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { useProducts, useCategories } from "@/hooks/use-products";
import { useDashboardKPIs } from "@/hooks/use-admin";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete } from "@/lib/api";
import type { Product, Category } from "@/types";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProducts, setSelectedProducts] = useState<Set<string | number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => apiDelete(`/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Mahsulotni o'chirishda xatolik";
      alert(msg);
    },
  });

  const handleDelete = (product: Product) => {
    const confirmed = window.confirm(
      `"${product.name}" mahsulotini o'chirishni xohlaysizmi?\n\nBu amalni qaytarib bo'lmaydi.`
    );
    if (confirmed) {
      deleteMutation.mutate(product.id);
    }
  };

  const { data: productsData, isLoading } = useProducts({
    page: currentPage,
    page_size: 20,
    search: searchQuery || undefined,
    category_id: categoryFilter !== "all" ? categoryFilter : undefined,
  });

  const { data: categoriesData } = useCategories();
  const { data: kpis } = useDashboardKPIs(365);

  const products = productsData?.items ?? [];
  const totalProducts = productsData?.total ?? 0;
  const totalPages = productsData?.pages ?? 1;
  const categories = (categoriesData ?? []) as Category[];

  const columns: Column<Product>[] = [
    {
      key: "name",
      label: "Mahsulot",
      sortable: true,
      render: (product) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {product.images?.[0]?.file_path ? (
              <img
                src={product.images[0].file_path}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-6 h-6 text-neutral-400" />
            )}
          </div>
          <div>
            <Link
              href={`/product/${product.slug}`}
              className="font-medium hover:text-primary-600 transition-colors"
            >
              {product.name}
            </Link>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{product.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Kategoriya",
      sortable: true,
      render: (product) => (
        <span>{product.category?.name ?? "—"}</span>
      ),
    },
    {
      key: "brand",
      label: "Brend",
      sortable: true,
      render: (product) => (
        <span>{product.brand?.name ?? "—"}</span>
      ),
    },
    {
      key: "price",
      label: "Narx",
      sortable: true,
      render: (product) => (
        <div>
          <span className="font-medium">{formatPrice(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-xs text-neutral-400 line-through ml-2">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Holat",
      sortable: true,
      render: (product) => (
        <StatusBadge status={product.is_active ? "active" : "draft"} />
      ),
    },
    {
      key: "badges",
      label: "Teglar",
      render: (product) => (
        <div className="flex gap-1 flex-wrap">
          {product.is_featured && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">Tavsiya</span>
          )}
          {product.is_new && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">New</span>
          )}
          {product.is_bestseller && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Xit</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Amallar",
      render: (product) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/admin/products/${product.slug}/edit`}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            title="Tahrirlash"
          >
            <Edit className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleDelete(product)}
            disabled={deleteMutation.isPending}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors disabled:opacity-50"
            title="O'chirish"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Mahsulotlar</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Mahsulotlar katalogini boshqarish
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button variant="default" leftIcon={<Plus className="w-4 h-4" />}>
            Mahsulot qo'shish
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="search"
              placeholder="Nomi yoki artikul bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900 dark:text-white"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:text-white"
            >
              <option value="all">Barcha kategoriyalar</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedProducts.size > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Tanlangan: {selectedProducts.size}
            </span>
            <Button size="sm" variant="outline">
              Holatni o'zgartirish
            </Button>
            <Button size="sm" variant="outline">
              Tanlanganlarni eksport qilish
            </Button>
            <Button size="sm" variant="destructive">
              Tanlanganlarni o'chirish
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Jami mahsulotlar</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
            {kpis?.total_products ?? totalProducts}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Natijada</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {totalProducts}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Kam qoldiq</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
            {kpis?.low_stock ?? 0}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Mavjud emas</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {kpis?.out_of_stock ?? 0}
          </p>
        </div>
      </div>

      {/* Results count & Export */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {isLoading ? "Yuklanmoqda..." : (
            <>Topilgan mahsulotlar: <span className="font-semibold">{totalProducts}</span></>
          )}
        </p>
        <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
          Eksport
        </Button>
      </div>

      {/* Products Table */}
      <DataTable
        columns={columns}
        data={products}
        keyExtractor={(product) => product.id}
        showCheckbox
        selectedItems={selectedProducts}
        onSelectionChange={setSelectedProducts}
        emptyMessage={isLoading ? "Yuklanmoqda..." : "Mahsulotlar topilmadi"}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-soft border border-neutral-200 dark:border-neutral-700">
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          Sahifa <span className="font-medium">{currentPage}</span> /{" "}
          <span className="font-medium">{totalPages}</span>
          {" "}({totalProducts} mahsulot)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Orqaga
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Oldinga
          </Button>
        </div>
      </div>
    </div>
  );
}
