import { Link } from "@remix-run/react";
import { FC, PropsWithChildren } from "react";

type ButtonProps = PropsWithChildren<{
  to: string;
  variant?: "secondary";
}>;

export const ButtonLink: FC<ButtonProps> = ({ to, children }) => {
  return (
    <Link
      to={to}
      className="w-full py-2 text-center border border-gray-500 rounded-md bg-gray-200"
    >
      {children}
    </Link>
  );
};
