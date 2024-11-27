import type { FC, PropsWithChildren } from "react";

export const MainFrame: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="md:max-w-screen-md h-full relative ml-auto mr-auto shadow-xl bg-white flex flex-col">
      <div className="flex flex-col" style={{ minHeight: "calc(100vh)" }}>
        {children}
      </div>
    </div>
  );
};
