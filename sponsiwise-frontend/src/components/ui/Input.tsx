"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon, className = "", id, ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label
                        htmlFor={id}
                        className="block text-sm font-medium text-text-secondary"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                            {icon}
                        </span>
                    )}
                    <input
                        ref={ref}
                        id={id}
                        className={`
              w-full rounded-[var(--radius-input)]
              border-2 border-border bg-white
              px-4 py-2.5 text-sm text-text-primary
              outline-none transition-all duration-200
              placeholder:text-text-muted
              hover:border-brand-300 hover:bg-white
              focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? "pl-10" : ""}
              ${error ? "border-error-500 focus:border-error-500 focus:ring-error-500/10" : ""}
              ${className}
            `}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="text-xs text-error-500 animate-fade-in">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
export default Input;
