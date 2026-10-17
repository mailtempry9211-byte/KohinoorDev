# Phone Link Hub - Development & UI/UX Guidelines

## Agent Directives

### 1. UI/UX Pro Max Design System
All user interface development (React Web Dashboard, Android App & Launcher layouts, dialogs, widgets, icons) must follow the **UI/UX Pro Max** guidelines:
- Adhere strictly to the design rules specified in [`.agents/rules/ui-ux.md`](file:///.agents/rules/ui-ux.md).
- To query design systems, color palettes, typography pairings, or stack-specific patterns, execute:
  `python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system` or `--domain <domain>` or `--stack <stack>`.
- Prioritize high accessibility (4.5:1 text contrast, 44x44px minimum touch targets, visible focus states, WCAG 2.2 AA).
- Maintain dark mode aesthetic consistency across Dashboard (`#0B0F19` background with Tailwind slate/indigo/cyan accents) and Android launcher/dialogs (`#111827` translucent surfaces with AMOLED depth).

### 2. Architecture & Code Quality
- Android: Kotlin, Jetpack components, minimal battery consumption, zero unwanted status notifications when stealth launcher is default.
- Dashboard: React, Vite, Tailwind CSS, Lucide icons, responsive card layouts, WebSockets live syncing.
- Server: Node.js Express, WebSocket event bus, low latency device controls.

