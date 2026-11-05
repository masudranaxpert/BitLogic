---
name: clean-admin-dashboard-ui
description: Anti-Slop SaaS & E-Commerce Admin Dashboard Design Skill (inspired by Uxerflow, Shadcn Admin Kit, and Jakub Krehel surface polish). Enforces zero verbose subtitle copy, single-number KPI strips, single-line data tables, moderate border radii, and expandable sidebar sub-menus with dedicated creation pages.
---

# Clean Admin Dashboard UI Skill (`SKILL.md`)

Use this skill whenever building or redesigning an Admin Dashboard, SaaS Console, or Digital Commerce Backoffice so the interface looks crafted, scannable, and free of "AI Slop" text clutter.

---

## 1. Zero "AI Slop" Copy Discipline (Strict Text Rules)
- **No Subtitle Paragraphs Under Page Titles**: Never add long explanatory sentences under `<h1>` or `<h2>` headings (e.g., ❌ *"Manage your subscription revenue, pre-stocked Vault credentials, digital deliveries, and warranty claims"*). Let the page title (`Dashboard`, `Product`, `Credential Vault`, `Customer`, `Media Library`, `Payments`) stand on its own.
- **Short Column & Button Labels**: Keep table headers and button labels to 1–2 words (`Product & Option`, `Price`, `Type`, `Stock`, `Warranty`, `Status`, `Action`).
- **No Redundant Top Header Navigation**: Do not duplicate sidebar links inside a top horizontal navbar. Start the main workspace immediately with the `<h1>` page title on the left and compact primary actions on the right.

---

## 2. 4-Column Stat Strip (`StatMetric` Pattern)
- **Single-Number KPI Values**: Inside the 4-column stat strip (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-x`), the main metric value MUST be a **single number or currency figure** (`10`, `৳12,75,800`, `2,255`, `7`) set in `font-display font-bold text-2xl sm:text-[26px] tabular-nums`.
- **Never Put Sentences in KPI Values**: Never render multi-word strings like `5 Products · 10 Options` or `4 Pending` in large monospace type, as they wrap onto two lines and create visual clutter.
- **Consistent 2-Element Footer**: Below the number, show only `vs last month` in muted slate and a compact soft-tinted badge (`↑ 24%`, `+ 5 products`) in `bg-emerald-50 text-emerald-700`.

---

## 3. Single-Line Data Table Rhythm
- **One Line Per Row (`whitespace-nowrap`)**: Every `<tr>` must stay on a single crisp horizontal line (`py-2.5 px-3 text-[13px] whitespace-nowrap`).
- **Never Stack 2–3 Sub-Lines Inside Table Cells**: Combine primary and secondary names inline using a muted em-dash or dot:
  ```tsx
  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
    {product.name} <span className="text-slate-400 font-normal">— {variant.name}</span>
  </td>
  ```
- **Soft-Tinted Rectangular Status Tags**: Use low-glare tinted tags (`rounded-[5px] px-2 py-0.5 text-xs font-medium`) instead of loud neon pills or multi-word status sentences (`In Stock`, `Out of Stock`, `Restock`, `Delivered`, `Pending`, `Claim`).

---

## 4. Expandable Sidebar Sub-Menus & Dedicated Pages (Avoid Cramped Modals)
- **Use Dedicated Pages for Creation & Import Workflows**: Complex workflows should live on their own sub-menu pages rather than inside cramped popup modals:
  - **Product** → `All Products` | `Add Product` (with Media Library picker & multi-option builder)
  - **Credential Vault** → `Vault Inventory` | `Manual Add` | `Bulk Import` (with delimiter parser & live preview table)
  - **Customer** → `All Customers` (single-line table) | `Customer View` (full customer profile, active plans, deliveries, and payment history) | `Add Customer`
  - **Media Library** → Dedicated file/image manager for product covers, brand icons, and login guides.

---

## 5. Typography, Color & Surface Polish
- **Font Trio**:
  - `--font-display`: `Plus Jakarta Sans` (headings & big KPI numbers)
  - `--font-sans`: `DM Sans` (table cells, menus, controls)
  - `--font-mono`: `JetBrains Mono` with `tabular-nums` (IDs, prices, keys, tokens, dates)
- **Moderate Radii**: Cards use `rounded-xl` (`12px`); inputs, buttons, and sidebar links use `rounded-lg` (`8px`); badges and checkboxes use `rounded-[5px]`.
- **Hairline Borders**: Use `1px` subtle borders (`border-slate-200/80 dark:border-slate-800`) on a `#f6f8fa` light canvas with `#059669` (Emerald 600) as the primary interactive accent.
