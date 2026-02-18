"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
    primary:
        "bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-md hover:shadow-lg hover:from-brand-600 hover:to-brand-500 active:scale-[0.97]",
    secondary:
        "bg-brand-50 text-brand-600 hover:bg-brand-100 active:scale-[0.97]",
    outline:
        "border-2 border-brand-200 text-brand-600 bg-white hover:border-brand-400 hover:bg-brand-50 active:scale-[0.97]",
    ghost:
        "text-text-secondary hover:bg-surface-muted hover:text-text-primary active:scale-[0.97]",
    danger:
        "bg-error-500 text-white shadow-md hover:bg-error-600 hover:shadow-lg active:scale-[0.97]",
};

const sizeClasses: Record<Size, string> = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-7 py-3.5 text-base gap-2.5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = "primary",
            size = "md",
            loading = false,
            icon,
            children,
            className = "",
            disabled,
            ...props
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={`
          inline-flex items-center justify-center font-semibold
          rounded-[var(--radius-button)]
          transition-all duration-200 ease-out
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
                {...props}
            >
                {loading ? (
                    <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                ) : icon ? (
                    <span className="shrink-0">{icon}</span>
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";
export default Button;
