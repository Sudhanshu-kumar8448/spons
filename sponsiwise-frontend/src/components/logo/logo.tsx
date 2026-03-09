
interface LogoProps {
  className?: string;
  /** Height in pixels – width scales proportionally */
  size?: number;
  /** Use light variant (white text) for dark backgrounds */
  variant?: "dark" | "light";
}

const Logo = ({ className = "", size = 36, variant = "dark" }: LogoProps) => {
  const textFill = variant === "light" ? "#ffffff" : "#0f172a";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 48"
      height={size}
      className={className}
      aria-label="SponsiWise logo"
      role="img"
    >
      <defs>
        <linearGradient id="sw-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>



      {/* "Sponsi" text */}
      <text
        x="29"
        y="35"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="900"
        fontSize="34"
        letterSpacing="-0.5"
        fill={textFill}
      >
        Sponsi
      </text>

      {/* "Wise" text with gradient */}
      <text
        x="140"
        y="35"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="900"
        fontSize="34"
        letterSpacing="-0.5"
        fill="url(#sw-grad)"
      >
        Wise
      </text>
    </svg>
  );
};

export default Logo;