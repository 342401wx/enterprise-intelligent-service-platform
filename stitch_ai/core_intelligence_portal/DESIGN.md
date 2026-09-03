---
name: Core Intelligence Portal
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  display-lg:
    fontFamily: Noto Sans SC
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Noto Sans SC
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-sm:
    fontFamily: Noto Sans SC
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Noto Sans SC
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-lg-mobile:
    fontFamily: Noto Sans SC
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Noto Sans SC
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  mono-metric:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system is built for high-stakes enterprise AI operations. The brand personality is **restrained, authoritative, and precise**, prioritizing utility over ornamentation. It is designed for professional users who require a focused environment for managing complex data and AI model configurations.

The design style is **Corporate Modern**, characterized by:
- **High-Density Utility:** Information is packed efficiently but maintained with strict white-space discipline to prevent cognitive overload.
- **Surface Layering:** A light gray background serves as the canvas, with pure white cards acting as the primary workspace to clearly separate control areas.
- **Subtle Visual Feedback:** Interaction is communicated through precise state changes (1px border shifts and slight tonal variations) rather than heavy animations.

## Colors

The palette is optimized for long-term task focus and accessibility in a professional environment.

- **Primary Blue (#2563EB):** Used for primary actions, active navigation states, and key progress indicators.
- **Teal (#0D9488):** Employed for AI-specific features, secondary success indicators, or specialized "Analyze" actions to differentiate from standard CRUD operations.
- **Neutrals:** The background is set to a cool `#F9FAFB` to reduce glare, while `#1F2937` provides high-contrast legibility for body text.
- **Semantic Colors:** Success, Warning, and Error colors are used sparingly for status badges and inline alerts to ensure critical information is never missed.

## Typography

The system utilizes **Noto Sans** for its exceptional support of Simplified Chinese and its neutral, modern appearance. 

- **Scale:** Body text defaults to 14px on desktop to accommodate high-density data tables. On mobile, the scale shifts to a minimum of 16px to ensure readability.
- **Hierarchy:** Bold weights are used strictly for headlines and table headers.
- **Monospace:** **JetBrains Mono** is reserved for System IDs, API keys, and performance metrics (e.g., Latency, Token count) to ensure numerical alignment and technical clarity.

## Layout & Spacing

This design system adheres to a strict **4px/8px grid system**. 

- **Grid Model:** A 12-column fluid grid is used for the main workspace, allowing cards to span 3, 4, 6, or 12 columns.
- **Breakpoints:**
  - **Mobile (< 768px):** Sidebar collapses into a hamburger menu or bottom navigation bar. Margins are 16px.
  - **Tablet (768px - 1280px):** Sidebar collapses to an icon-only "rail" view.
  - **Desktop (> 1280px):** Fixed 240px sidebar for complex navigation. 
- **Density:** Padding within cards is typically 16px or 24px, while dense data tables use 8px vertical padding per row.

## Elevation & Depth

Visual hierarchy is established through surface contrast rather than dramatic shadows.

- **Base Layer:** `#F9FAFB` (The platform background).
- **Workspace Layer:** `#FFFFFF` (White cards) with a 1px border of `#E5E7EB`.
- **Shadows:** Use a single, very subtle shadow for floating elements (dropdowns, modals): `0px 4px 6px -1px rgba(0, 0, 0, 0.05), 0px 2px 4px -2px rgba(0, 0, 0, 0.05)`.
- **Interactive Depth:** On hover, cards do not lift; instead, the border color darkens to `#D1D5DB` or a primary blue tint to indicate interactivity.

## Shapes

The shape language is conservative and professional.

- **Standard Radius:** All UI components (buttons, inputs, cards) use a **6px to 8px** corner radius. This provides a modern feel without appearing overly "bubbly" or consumer-grade.
- **Icons:** Use Lucide-style linear icons with a 2px stroke weight. Icons must never be filled unless they are in an "active" state in the sidebar.

## Components

### Buttons
- **Primary:** Solid `#2563EB` background, white text. No gradient.
- **Secondary:** White background, `#E5E7EB` border, `#1F2937` text.
- **States:** Hover adds a 10% black overlay. Loading state replaces text with a center-aligned spinner while maintaining button width.

### Input Fields
- **Default:** 1px border `#E5E7EB`.
- **Focus:** 1px primary blue border with a 2px soft blue halo (ring).
- **Labels:** Always positioned above the field in `label-sm` style.

### Navigation
- **Sidebar:** Fixed at 240px. Uses a dark or very light theme. Active items receive a vertical 3px primary blue "indicator" on the left edge.
- **Top Bar:** 64px height, blurred background or solid white. Contains breadcrumbs, department selector, and user profile.

### Feedback
- **Chips:** Small, rounded-md with low-opacity background tints (e.g., Success chip uses a 10% opacity green background with 100% opacity green text).
- **Loading:** Use skeleton screens for card content instead of full-page spinners to maintain the structural layout during data fetching.