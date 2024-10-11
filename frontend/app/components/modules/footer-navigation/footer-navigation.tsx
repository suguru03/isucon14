import { NavLink } from "@remix-run/react";
import type { FC } from "react";
import type { IconType } from "~/components/icon/type";

type NavigationMenuType = {
  link: `/${string}`;
  label: string;
  icon: IconType;
};

export const FooterNavigation: FC<{
  navigationMenus: [NavigationMenuType, NavigationMenuType];
}> = ({ navigationMenus }) => {
  return (
    <nav className="sticky bottom-[env(safe-area-inset-bottom)] z-10 border-t border-secondary-border bg-white">
      <ul className="flex justify-around">
        {navigationMenus.map((menu, index) => (
          <li
            key={index}
            className="flex justify-center border-b-4 has-[.active]:border-black"
          >
            <NavLink
              to={menu.link}
              end
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-4 py-1.5 text-xs hover:bg-secondary-hover ${isActive ? "pointer-events-none active" : ""}`
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
