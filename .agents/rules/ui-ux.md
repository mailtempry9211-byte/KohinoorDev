# UI/UX Pro Max Design Intelligence Rules

These rules are active whenever designing, building, modifying, or reviewing user interfaces, components, styles, layouts, or visual controls across Web, Mobile (Android/iOS), or Desktop.

---

## 1. Core Principles & Priority Hierarchy

When building or modifying UI/UX, evaluate decisions against these priority tiers:

1. **Accessibility (CRITICAL)**:
   - Text contrast must meet minimum **4.5:1** for normal text, **3:1** for large text.
   - Interactive touch targets must be at least **44×44px** (Apple HIG) / **48×48dp** (Material Design) with at least **8px** gap between adjacent targets.
   - Visible focus indicators (2–4px) on all interactive elements. Never remove focus rings without an accessible replacement.
   - Meaningful alt text on images; `aria-label` or `accessibilityLabel` on icon-only buttons.
   - Respect `prefers-reduced-motion` for animations and transitions.

2. **Touch & Interaction Feedback (CRITICAL)**:
   - Provide immediate visual feedback on tap/press (active state, ripple, color tint, scale).
   - Async actions (API calls, submits) must show visual loading indicators (spinners, skeleton screens) and disable buttons to prevent duplicate triggers.
   - Clear, inline validation and error messages placed right next to the affected inputs.

3. **Performance & Visual Stability (HIGH)**:
   - Zero Cumulative Layout Shift (CLS < 0.1): Reserve dimensions for images, charts, widgets, and dynamic banners.
   - Debounce rapid inputs (search bars, sliders).
   - Virtualize long lists (>50 items) for smooth 60fps scrolling.

4. **Visual Hierarchy & Styling (HIGH)**:
   - **Colors**: Use semantic color tokens (primary, surface, background, muted, border, error/warning/success) rather than raw hex codes in component files.
   - **Typography**: Base font 16px (14px minimum on compact badges/captions), line-height 1.4–1.6 for readability. Maximum 2 font families per project (e.g. Sans + Monospace for data).
   - **Spacing**: Follow a strict 4px/8px modular scale (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`).
   - **Icons**: Use consistent SVG icons (Lucide, Phosphor, Material). Do not mix arbitrary emoji with system icon packs.

5. **Responsive & Platform Adaptation (HIGH)**:
   - Mobile-first layout adaptability: no horizontal scroll bars on viewport containers.
   - Safe areas: Respect notch, status bar, and home indicator insets (`fitsSystemWindows`, `env(safe-area-inset)`).
   - Dark mode: Avoid pure `#000000` against pure `#FFFFFF` high glare; use deep slate `#090D16` / `#111827` surfaces with soft contrast layers.

---

## 2. UI/UX Pro Max Search Integration

When generating a new design system, component, palette, or stack-specific layout, leverage the local UI/UX Pro Max intelligence engine:

```bash
# Generate complete design system for a product domain
python .agents/skills/ui-ux-pro-max/scripts/search.py "<product type> <style keywords>" --design-system

# Focused domain query (style, color, chart, ux, typography, icons, gsap, react, web)
python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>

# Stack-specific best practices (e.g. react, html-tailwind, jetpack-compose, swiftui)
python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack <stack>
```

