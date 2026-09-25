"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  inputSize?: "sm" | "md" | "lg";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, inputSize = "md", id, ...props }, ref) => {
    const inputId = id || props.name || label?.toLowerCase().replace(/\s/g, "-");

    const sizeClasses = {
      sm: "h-9 text-sm px-3",
      md: "h-11 text-sm px-4",
      lg: "h-12 text-base px-5",
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full rounded border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500",
              "transition-all duration-200",
              "focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:border-primary-600 dark:focus:ring-primary-900",
              "hover:border-neutral-300 dark:hover:border-neutral-600",
              sizeClasses[inputSize],
              icon && "pl-10",
              error &&
                "border-red-300 focus:border-red-400 focus:ring-red-100",
              className
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-xs text-red-500"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
