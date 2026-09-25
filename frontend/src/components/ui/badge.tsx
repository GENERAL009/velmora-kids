import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center font-medium transition-colors uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "bg-neutral-100 text-neutral-700 border border-neutral-200",
        new: "bg-secondary-100 text-secondary-700 border border-secondary-200",
        bestseller:
          "bg-accent-100 text-accent-700 border border-accent-200",
        sale: "bg-primary-100 text-primary-700 border border-primary-200",
        limited:
          "bg-purple-50 text-purple-700 border border-purple-200",
        premium:
          "bg-gradient-to-r from-accent-100 to-accent-200 text-accent-800 border border-accent-300",
        outline:
          "bg-transparent text-neutral-600 border border-neutral-300",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5 rounded-sm",
        md: "text-xs px-2.5 py-1 rounded-sm",
        lg: "text-xs px-3 py-1.5 rounded",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
