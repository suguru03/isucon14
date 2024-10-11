import { Link } from "@remix-run/react";
import { ComponentProps, FC, PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

type Variant = "light" | "danger";

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
  const variantClasses = (() => {
    switch (variant) {
      case "danger":
        return "text-white bg-red-600 active:bg-red-700 hover:bg-red-700 focus:bg-red-700";
      case "light":
      default:
        return "bg-neutral-100 active:bg-neutral-200 hover:bg-neutral-200 focus:bg-neutral-200";
    }
  })();
  return (
    <button
      type="button"
      className={twMerge(
        "rounded-md py-2 px-4 border border-transparent text-center transition-all shadow-md shadow-gray-400 hover:shadow-lg focus:shadow-none active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
        variantClasses,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
