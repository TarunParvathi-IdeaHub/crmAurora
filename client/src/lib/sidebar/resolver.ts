import { moduleRegistry } from "./registry";
import { menuByRole } from "./menuByRole";
import { facultyMenu } from "./menus/faculty";
import type { MenuItem } from "./types";

/**
 * Resolves which sidebar menu to display for the given pathname and role.
 *
 * Resolution order:
 *  1. Walk the module registry in order (most-specific prefixes first).
 *     Return the first entry whose routePrefix matches AND whose roles (if set)
 *     include the current role.
 *  2. Fall back to the role's default menu from `menuByRole`.
 *  3. Ultimate fallback: faculty menu (prevents empty sidebar).
 */
export function resolveMenu(pathname: string, role: string | null): MenuItem[] {
  if (!role) return [];

  for (const entry of moduleRegistry) {
    if (pathname.startsWith(entry.routePrefix)) {
      const roleMatches = !entry.roles || entry.roles.includes(role);
      if (roleMatches) return entry.menu;
    }
  }

  return menuByRole[role] ?? facultyMenu;
}
