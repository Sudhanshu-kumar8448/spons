import { ReactNode } from "react";

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
};

export default function Card({
    children,
    className = "",
    hover = false,
    padding = "md",
}: CardProps) {
    return (
        <div
            className={`
        rounded-[var(--radius-card)] bg-surface border border-border-light
        shadow-[var(--shadow-card)]
        ${hover ? "hover-lift cursor-pointer" : ""}
        ${paddingClasses[padding]}
        ${className}
      `}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    children: ReactNode;
    className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
    return (
        <div className={`mb-4 flex items-center justify-between ${className}`}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <h3 className={`text-lg font-semibold text-text-primary ${className}`}>
            {children}
        </h3>
    );
}
