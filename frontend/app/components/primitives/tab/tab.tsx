import { twMerge } from "tailwind-merge";

type TextProps<T extends string> = {
  tabs: readonly { key: T; label: string }[];
  activeTab?: T;
  className?: string;
  onTabClick?: (tab: T) => void;
};

export const Tab = <T extends string>({
  tabs,
  activeTab,
  className,
  onTabClick,
}: TextProps<T>) => {
  return (
    <nav className={twMerge(["border-b", className])}>
      <ul className="flex">
        {tabs.map((tab) => (
          <li
            key={tab.key}
            className={tab.key === activeTab ? "border-b-4 border-black" : ""}
          >
            <button className="px-4 py-2" onClick={() => onTabClick?.(tab.key)}>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
