import type { PermissionName } from "./permissions";

export type ModuleItem = {
  id: string;
  title: string;
  description: string;
  path: string;
  domain: PermissionName;
};