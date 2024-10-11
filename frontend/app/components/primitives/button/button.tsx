import { Link } from "@remix-run/react";
import { ComponentProps, FC, PropsWithChildren, useMemo } from "react";
import { twMerge } from "tailwind-merge";

type Variant = "light" | "primary" | "danger";

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
        "w-full py-2 text-center border border-gray-500 rounded-md bg-gray-200",
        className,
      )}
    >
      {children}
    </Link>
  );
};

export const Button: FC<
  PropsWithChildren<ComponentProps<"button"> & { variant?: Variant }>
> = ({ children, className, variant, ...props }) => {
  const variantClasses = useMemo(() => {
    switch (variant) {
      case "primary":
        return "text-white bg-[#21517A] active:brightness-[85%] hover:brightness-[85%] focus:brightness-[85%]";
      case "danger":
        return "text-white bg-[#C52E23] active:brightness-90 hover:brightness-90 focus:brightness-90";
      case "light":
      default:
        return "bg-[#F0EFED] active:brightness-90 hover:brightness-90 focus:brightness-90";
    }
  }, [variant]);
  return (
    <button
      type="button"
      className={twMerge(
        "rounded-md py-3 px-4 border border-transparent text-gray-700 text-center transition-all shadow-md shadow-gray-400 hover:shadow-lg focus:shadow-none active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
        variantClasses,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
