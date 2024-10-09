import { Link } from "@remix-run/react";
import { FC, PropsWithChildren } from "react";

export const ButtonLink: FC<
  PropsWithChildren<{
    to: string;
    variant?: "secondary";
  }>
> = ({ to, children }) => {
  return (
    <Link
      to={to}
      className="w-full py-2 text-center border border-gray-500 rounded-md bg-gray-200"
    >
      {children}
    </Link>
  );
};

export const Button: FC<
  PropsWithChildren<
    {
      onClick: React.MouseEventHandler<HTMLButtonElement>;
    } & React.ButtonHTMLAttributes<HTMLButtonElement>
  >
> = ({ children, ...props }) => {
  return (
    <button
      {...props}
      type="button"
      className="w-full py-2 text-center border border-gray-500 rounded-md bg-gray-200"
    >
      {children}
    </button>
  );
};
