import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "rounded-lg bg-[#8A4FF7] text-white font-medium hover:bg-[#7742e0] transition-colors",
  secondary:
    "rounded-lg bg-white border border-gray-300 text-[#1A1A1A] font-medium hover:bg-gray-50 transition-colors",
  ghost: "text-[#1A1A1A] hover:text-[#4A4A4A] transition-colors",
};

type ButtonProps = {
  variant?: ButtonVariant;
  size?: "sm" | "nav" | "md";
  children: React.ReactNode;
  className?: string;
} & (
  | { href: string; as?: never }
  | { href?: never; as?: "button"; type?: "button" | "submit" }
);

const sizeStyles: Record<string, string> = {
  sm: "px-4 py-2",
  nav: "px-5 py-2.5",
  md: "px-6 py-3",
};

const sizeStylesGhost: Record<string, string> = {
  sm: "px-4 py-2",
  nav: "px-5 py-2.5",
  md: "px-6 py-3",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium";
  const variantClass = variantStyles[variant];
  const sizeClass =
    variant === "ghost" ? sizeStylesGhost[size] : sizeStyles[size];
  const classes = `${baseStyles} ${variantClass} ${sizeClass} ${className}`.trim();

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const buttonType = ("type" in props ? props.type : undefined) ?? "button";

  return (
    <button type={buttonType} className={classes}>
      {children}
    </button>
  );
}
