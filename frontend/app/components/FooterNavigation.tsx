import { NavLink } from "@remix-run/react";
import type { IconType } from "./icon/type";

type NavigationMenuType = {
  link: `/${string}`;
  label: string;
  icon: IconType;
};

export const FooterNavigation = ({
  navigationMenus,
}: {
  navigationMenus: [NavigationMenuType, NavigationMenuType];
}) => {
  return (
    <nav className="sticky bottom-0 z-10 border-t border-secondary-border bg-white">
      <ul className="grid grid-cols-2">
        {navigationMenus.map((menu, index) => (
          <li key={index} className="flex justify-center">
            <NavLink
              to={menu.link}
              end
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-4 py-1.5 text-xs hover:bg-secondary-hover ${isActive ? "pointer-events-none" : ""}`
              }
            >
              <menu.icon className="size-[24px] stroke-2" />
              {menu.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
