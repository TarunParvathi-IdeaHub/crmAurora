import type { ComponentType } from "react";

export type MenuItem = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  path: string;
};

/**
 * A module route entry maps a URL prefix to a sidebar menu.
 * Entries are matched in order — most specific prefixes must come first.
 * If `roles` is defined, the entry only applies to those roles.
 */
export type ModuleRoute = {
  routePrefix: string;
  roles?: string[];
  menu: MenuItem[];
};
