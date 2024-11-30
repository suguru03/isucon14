import { Link } from "@remix-run/react";
import { ComponentProps, FC, PropsWithChildren, useMemo } from "react";
import { twMerge } from "tailwind-merge";

type Variant = "light" | "primary" | "danger" | "skelton";
type Size = "sm" | "md";

export const ButtonLink: FC<PropsWithChildren<ComponentProps<typeof Link>>> = ({
  to,
  className,
  children,
  ...props
}) => {
  return (
    <Link
      {...props}
      to={to}
      className={twMerge(
        "w-full py-2 text-center border border-neutral-500 rounded-md bg-neutral-200",
        className,
      )}
    >
      {children}
    </Link>
  );
};

export const Button: FC<
  PropsWithChildren<
    ComponentProps<"button"> & { variant?: Variant; size?: Size }
  >
> = ({
  children,
  className,
  variant = "light",
  size = "md",
  disabled,
  ...props
}) => {
  const variantClasses = useMemo(() => {
    switch (variant) {
      case "primary":
        return "text-white bg-sky-700";
      case "danger":
        return "text-white bg-rose-600";
      case "light":
        return "bg-[#F0EFED]";
      default:
        return;
    }
  }, [variant]);

  const sizeClasses = useMemo(() => {
    switch (size) {
      case "sm":
        return "py-2 px-3";
      case "md":
        return "py-3.5 px-4";
    }
  }, [size]);

  return (
    <button
      type="button"
      className={twMerge(
        "text-center text-sm",
        "transition-[filter]",
        variant !== "skelton" &&
          "rounded-md bg-neutral-800 border border-transparent shadow-md",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900",
        "disabled:opacity-50 disabled:shadow-none",
        !disabled &&
          "hover:brightness-90 active:brightness-90 focus:brightness-90",
        variantClasses,
        sizeClasses,
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
