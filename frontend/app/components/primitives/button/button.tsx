import { Link } from "@remix-run/react";
import { ComponentProps, FC, PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

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

export const Button: FC<PropsWithChildren<ComponentProps<"button">>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <button
      type="button"
      className={twMerge(
        "rounded-md bg-gray-800 py-2 px-4 border border-transparent text-center text-sm text-white transition-all shadow-md hover:shadow-lg focus:bg-gray-700 focus:shadow-none active:bg-gray-700 hover:bg-gray-700 active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none ml-2",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
