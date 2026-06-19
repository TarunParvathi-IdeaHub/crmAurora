# Sidebar Configuration Guide

This guide explains exactly how the sidebar works and how to add, change, or remove
sidebar menu items for any role. All sidebar logic lives in one place:

```
client/src/lib/sidebar/
```

---

## How the Sidebar Works (Overview)

When a user visits any `/modules/...` page, the app runs this logic:

```
Current URL + Current Role
        ↓
   registry.ts   ← checks URL prefix first
        ↓ (no match)
  menuByRole.ts  ← falls back to the role's default menu
        ↓
 Sidebar renders the matched menu
```

There are **two kinds of menus**:

| Kind | Where it is defined | When it shows |
|---|---|---|
| **Default menu** | `menuByRole.ts` | When the user is NOT inside a specific sub-module URL |
| **Sub-module menu** | `registry.ts` + `menus/*.ts` | When the user is inside a specific URL like `/modules/crm/enquiry` |

---

## File Map — What Each File Does

```
lib/sidebar/
  types.ts          — TypeScript types (MenuItem, ModuleRoute). Do not edit unless adding new fields.
  index.ts          — Re-exports everything. Do not edit unless adding a new export.
  menuByRole.ts     — Maps each role to its DEFAULT sidebar menu.
  registry.ts       — Maps URL prefixes to sub-module menus.
  resolver.ts       — Logic that picks the right menu. Do not edit.
  modulesByRole.ts  — Module cards shown on the dashboard grid. (Not the sidebar itself.)
  menus/
    admin.ts        — All menu arrays for admin roles.
    crm.ts          — All menu arrays for CRM roles (admissionDirector, counsellor, etc.).
    faculty.ts      — Menu array for faculty role.
    applicant.ts    — Menu array for Applicant role.
```

---

## Part 1 — Change an Existing Sidebar Item

**Use case:** You want to rename a label, change the URL, or swap the icon on an existing item.

### Files to change: 1 file only

Open the menu file for the role you want to change:

- CRM roles → `menus/crm.ts`
- Admin roles → `menus/admin.ts`
- Faculty → `menus/faculty.ts`
- Applicant → `menus/applicant.ts`

### Example — Rename "Leads" to "All Leads" in the Enquiry menu

**File:** `menus/crm.ts`

Find `enquiryMenu` and change the `label` field:

```typescript
// BEFORE
{ id: "leads", label: "Leads", icon: Users, path: "/modules/crm/leads/all" },

// AFTER
{ id: "leads", label: "All Leads", icon: Users, path: "/modules/crm/leads/all" },
```

### Example — Change the URL of an item

```typescript
// BEFORE
{ id: "ug-leads", label: "UG Leads", icon: FileSearch, path: "/modules/crm/leads/mine" },

// AFTER
{ id: "ug-leads", label: "UG Leads", icon: FileSearch, path: "/modules/crm/leads/ug" },
```

> **Important:** If you change the `path`, you must also make sure that Next.js page route exists
> under `src/app/(authenticated)/modules/...`. Otherwise the link goes to a 404.

### Icons

Icons come from the `lucide-react` package. Find icon names at https://lucide.dev/icons/

```typescript
// Add the icon to the import at the top of the file
import { Users, FileSearch, NewIconName } from "lucide-react";

// Then use it in your menu item
{ id: "my-item", label: "My Item", icon: NewIconName, path: "/modules/..." },
```

---

## Part 2 — Add a New Item to an Existing Menu

**Files to change: 1 file only**

Open the correct `menus/*.ts` file and add a new object to the array.

### Example — Add "Walk-ins" to the Enquiry sidebar

**File:** `menus/crm.ts`

```typescript
import { Users, UserCheck } from "lucide-react"; // add UserCheck to the import

export const enquiryMenu: MenuItem[] = [
  { id: "dashboard",  label: "Dashboard",  icon: LayoutDashboard, path: "/dashboard" },
  { id: "leads",      label: "All Leads",  icon: Users,           path: "/modules/crm/leads/all" },
  { id: "ug-leads",   label: "UG Leads",   icon: FileSearch,      path: "/modules/crm/leads/mine" },
  { id: "pg-leads",   label: "PG Leads",   icon: Phone,           path: "/modules/crm/leads/follow-ups" },
  { id: "phd-leads",  label: "Phd Leads",  icon: RefreshCcw,      path: "/modules/crm/leads/convert" },

  // ↓ New item added here
  { id: "walk-ins",   label: "Walk-ins",   icon: UserCheck,       path: "/modules/crm/leads/walk-ins" },
];
```

Each item requires exactly these 4 fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique key within this menu. Use kebab-case. |
| `label` | string | Text shown in the sidebar. |
| `icon` | Lucide icon | Import from `lucide-react`. |
| `path` | string | The URL this item links to. |

---

## Part 3 — Add a Brand New Sub-Module Sidebar (New Section)

**Use case:** You are building a new module, e.g. `/modules/crm/finance-leads`, and it needs its own dedicated sidebar.

### Files to change: 2 files

1. `menus/crm.ts` (or create a new `menus/finance.ts` for a different domain)
2. `registry.ts`

---

### Step 1 of 2 — Define the menu array in `menus/crm.ts`

Add a new exported array at the bottom of the file:

```typescript
// ─── CRM Sub-Module: Finance Leads ────────────────────────────────────────────

export const financeLeadsMenu: MenuItem[] = [
  { id: "dashboard",       label: "Dashboard",        icon: LayoutDashboard, path: "/dashboard" },
  { id: "finance-pending", label: "Pending Payments", icon: TrendingUp,      path: "/modules/crm/finance-leads/pending" },
  { id: "finance-paid",    label: "Paid",             icon: CheckCircle2,    path: "/modules/crm/finance-leads/paid" },
];
```

---

### Step 2 of 2 — Register the URL prefix in `registry.ts`

1. Import your new menu at the top of `registry.ts`:

```typescript
import {
  admissionsMenu,
  enquiryMenu,
  // ... existing imports ...
  financeLeadsMenu,        // ← add this
} from "./menus/crm";
```

2. Add a new entry inside `moduleRegistry`:

```typescript
// ── CRM: Finance Leads sub-module ─────────────────────────────────────────────
{
  routePrefix: "/modules/crm/finance-leads",
  roles: ["admissionDirector", "admissionIncharge"],
  menu: financeLeadsMenu,
},
```

> **Rule:** More specific URL prefixes must be listed BEFORE broader ones.
> Example: `/modules/crm/leads/ug` must come before `/modules/crm/leads`.

---

## Part 4 — Add or Change the Default Menu for a Role

**Use case:** You want to change what sidebar a role sees when they first log in and land on the dashboard or any page not inside a specific sub-module.

### Files to change: 2 files

1. `menus/*.ts` — define or edit the default menu array
2. `menuByRole.ts` — point the role to that array

---

### Example — Give `admissionIncharge` its own default menu instead of sharing with `admissionDirector`

**Step 1:** Add a new array in `menus/crm.ts`:

```typescript
export const admissionInchargeDefaultMenu: MenuItem[] = [
  { id: "dashboard",       label: "Dashboard",       icon: LayoutDashboard, path: "/dashboard" },
  { id: "enquiry",         label: "Enquiry",         icon: UserPlus,        path: "/modules/crm/enquiry" },
  { id: "admissions",      label: "Admissions",      icon: FileText,        path: "/modules/crm/admissions" },
  { id: "admission-cycle", label: "Admission Cycle", icon: Calendar,        path: "/modules/crm/admission-cycle" },
];
```

**Step 2:** Open `menuByRole.ts` and update the role:

```typescript
// BEFORE
admissionIncharge: admissionDirectorDefaultMenu,

// AFTER
admissionIncharge: admissionInchargeDefaultMenu,
```

Also add the import at the top of `menuByRole.ts`:

```typescript
import { admissionDirectorDefaultMenu, admissionCounsellorDefaultMenu, admissionInchargeDefaultMenu } from "./menus/crm";
```

---

## Part 5 — Add a Brand New Role with Its Own Sidebar

**Use case:** A new role (e.g. `financeManager`) is being added to the system and needs its own sidebar.

### Files to change: 3 files

1. `menus/finance.ts` (new file — create it)
2. `menuByRole.ts`
3. `registry.ts` (only if the new role has sub-module menus)

---

### Step 1 of 3 — Create `menus/finance.ts`

```typescript
import { BarChart3, FileText, LayoutDashboard, TrendingUp } from "lucide-react";
import type { MenuItem } from "../types";

export const financeManagerDefaultMenu: MenuItem[] = [
  { id: "dashboard",  label: "Dashboard",      icon: LayoutDashboard, path: "/dashboard" },
  { id: "invoices",   label: "Invoices",       icon: FileText,        path: "/modules/finance/invoices" },
  { id: "payments",   label: "Payments",       icon: TrendingUp,      path: "/modules/finance/payments" },
  { id: "reports",    label: "Reports",        icon: BarChart3,       path: "/modules/finance/reports" },
];
```

---

### Step 2 of 3 — Register the default menu in `menuByRole.ts`

```typescript
import { financeManagerDefaultMenu } from "./menus/finance";   // ← add import

export const menuByRole: Record<string, MenuItem[]> = {
  admin:                adminInstituteMenu,
  faculty:              facultyMenu,
  Applicant:            ApplicantMenu,
  admissionDirector:    admissionDirectorDefaultMenu,
  admissionIncharge:    admissionDirectorDefaultMenu,
  admissionConsultant:  admissionCounsellorDefaultMenu,
  admissionCounsellor:  admissionCounsellorDefaultMenu,
  financeManager:       financeManagerDefaultMenu,   // ← add this line
};
```

---

### Step 3 of 3 — Add registry entries (if the role has sub-module pages)

Only needed if `financeManager` navigates into specific sub-module routes that need a different
sidebar than the default. Follow the same pattern from **Part 3**.

---

## Quick Reference — Which File to Change

| Task | Files changed |
|---|---|
| Rename a sidebar label | `menus/[domain].ts` — 1 file |
| Change a sidebar URL | `menus/[domain].ts` — 1 file |
| Add an item to an existing menu | `menus/[domain].ts` — 1 file |
| Remove an item from a menu | `menus/[domain].ts` — 1 file |
| Add a new sub-module sidebar | `menus/[domain].ts` + `registry.ts` — 2 files |
| Change a role's default sidebar | `menus/[domain].ts` + `menuByRole.ts` — 2 files |
| Add a brand new role sidebar | `menus/[domain].ts` (new) + `menuByRole.ts` + `registry.ts` — 3 files |

---

## Common Mistakes

### Mistake 1 — Menu items point to a different URL than the registry

```
registry.ts  routePrefix: "/modules/crm/enquiry"
menus/crm.ts paths: "/modules/crm/leads/all"   ← mismatch!
```

When the user clicks a menu item, the URL changes to `/modules/crm/leads/all`.
The registry no longer matches `/modules/crm/enquiry`, so the sidebar switches back to the default.

**Fix:** Add BOTH URL prefixes to the registry pointing to the same menu:

```typescript
{ routePrefix: "/modules/crm/enquiry", roles: [...], menu: enquiryMenu },
{ routePrefix: "/modules/crm/leads",   roles: [...], menu: enquiryMenu },
```

---

### Mistake 2 — Editing `modulesByRole.ts` to change the sidebar

`modulesByRole.ts` controls the **dashboard module cards** (the grid of tiles you see when you
first log in). It does **not** control the sidebar inside `/modules/...` pages.
Edit `menus/*.ts` files to change the sidebar.

---

### Mistake 3 — More specific registry entry listed AFTER a broader one

```typescript
// WRONG ORDER
{ routePrefix: "/modules/crm/leads" },         // broader — matched first!
{ routePrefix: "/modules/crm/leads/ug" },      // never reached
```

```typescript
// CORRECT ORDER
{ routePrefix: "/modules/crm/leads/ug" },      // specific first
{ routePrefix: "/modules/crm/leads" },         // broader fallback
```

---

### Mistake 4 — Forgetting to import a new icon

Every icon must be imported from `lucide-react` at the top of the menu file.
Browse available icons at: https://lucide.dev/icons/
