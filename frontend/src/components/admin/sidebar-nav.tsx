"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FolderTree,
  Warehouse,
  ShoppingCart,
  Users,
  MessageSquare,
  Headphones,
  CreditCard,
  Tag,
  Star,
  BarChart3,
  UserCog,
  Settings,
  Image as ImageIcon,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Заказы",
    href: "/admin/orders",
    icon: ShoppingBag,
  },
  {
    label: "Товары",
    href: "/admin/products",
    icon: Package,
  },
  {
    label: "Категории",
    href: "/admin/categories",
    icon: FolderTree,
  },
  {
    label: "Бренды",
    href: "/admin/brands",
    icon: Tag,
  },
  {
    label: "Баннеры",
    href: "/admin/banners",
    icon: ImageIcon,
    roles: ["director", "admin", "super_admin"],
  },
  {
    label: "Остатки",
    href: "/admin/inventory",
    icon: Warehouse,
  },
  {
    label: "Касса",
    href: "/admin/pos",
    icon: ShoppingCart,
    roles: ["director", "admin", "super_admin", "seller"],
  },
  {
    label: "Клиенты",
    href: "/admin/customers",
    icon: Users,
  },
  {
    label: "CRM",
    href: "/admin/crm",
    icon: MessageSquare,
    roles: ["director", "admin", "sales", "crm"],
  },
  {
    label: "Колл-центр",
    href: "/admin/call-center",
    icon: Headphones,
    roles: ["director", "admin", "call_center"],
  },
  {
    label: "Платежи",
    href: "/admin/payments",
    icon: CreditCard,
    roles: ["director", "admin", "accountant"],
  },
  {
    label: "Акции",
    href: "/admin/promotions",
    icon: Tag,
    roles: ["director", "admin", "marketing"],
  },
  {
    label: "Отзывы",
    href: "/admin/reviews",
    icon: Star,
  },
  {
    label: "Отчёты",
    href: "/admin/reports",
    icon: BarChart3,
    roles: ["director", "admin", "accountant"],
  },
  {
    label: "Пользователи",
    href: "/admin/users",
    icon: UserCog,
    roles: ["director", "admin"],
  },
  {
    label: "Настройки",
    href: "/admin/settings",
    icon: Settings,
    roles: ["director", "admin"],
  },
];

interface SidebarNavProps {
  userRole?: string;
  className?: string;
}

export function SidebarNav({ userRole = "admin", className }: SidebarNavProps) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (userRole === "super_admin") return true;
    return item.roles.includes(userRole);
  });

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {filteredNavItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
              isActive
                ? "bg-primary-500 text-white shadow-sm"
                : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
