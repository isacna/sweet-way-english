import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "rounded-xl bg-accent text-white font-semibold shadow-[0_3px_0_0_var(--color-accent-strong)] hover:bg-accent-strong active:translate-y-[2px] active:shadow-none transition-all",
  secondary:
    "rounded-xl bg-white border border-line-strong text-ink font-semibold hover:bg-gray-50 hover:border-gray-300 transition-colors",
  ghost: "rounded-xl text-ink-soft font-semibold hover:text-ink hover:bg-gray-100 transition-colors",
};

type ButtonProps = {
  variant?: ButtonVariant;
  size?: "sm" | "nav" | "md";
  children: React.ReactNode;
  className?: string;
} & (
  | { href: string; as?: never }
  | ({
      href?: never;
      as?: "button";
      type?: "button" | "submit";
    } & React.ButtonHTMLAttributes<HTMLButtonElement>)
);

const sizeStyles: Record<string, string> = {
  sm: "min-h-[40px] px-4 py-2 text-sm",
  nav: "min-h-[44px] px-5 py-2.5",
  md: "min-h-[48px] px-6 py-3",
};

const sizeStylesGhost = sizeStyles;

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
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

  const {
    type: buttonTypeProp,
    disabled,
    onClick,
    as,
    ...restButton
  } = props as { as?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>;
  void as;
  const buttonType = buttonTypeProp ?? "button";

  return (
    <button
      type={buttonType}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...restButton}
    >
      {children}
    </button>
  );
}
