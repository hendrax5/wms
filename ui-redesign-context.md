# UI Redesign Context for WMS Application

This document provides context and guidelines for redesigning the user interface of the Warehouse Management System (WMS-2026) to achieve a modern, "fresh", and premium look.

## 1. Technology Stack
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4 (using `@tailwindcss/postcss`) + standard CSS variables
- **Icons**: `lucide-react`
- **Fonts**: Plus Jakarta Sans (loaded via Google Fonts)

## 2. Current State & Configuration
- **Theme**: Currently using a dark theme as default.
  - Background: `#020617` (Slate 950)
  - Surface: `#0F172A` (Slate 900)
  - Primary Accent: `#22C55E` (Green 500)
- **Key Components in `globals.css`**:
  - `.glass` & `.glass-card`: Using `backdrop-filter: blur(20px)` with semi-transparent backgrounds.
  - `.stat-card`: Utilizes hover effects with slight translations and glowing borders.
  - Animations: Custom `pulse-glow`, `fadeIn`, `slideInLeft`.
- **Tailwind Config**:
  - `tailwind.config.js` extends colors (surface, primary) and animations.

## 3. Redesign Goals ("Fresh" Look)
The overarching goal is to make the application feel more vibrant, dynamic, and professional ("premium"). 

### Recommended Design System (Based on `ui-ux-pro-max` intelligence)
**Style Keywords:** Modern, SaaS Dashboard, Premium, Clean, Glassmorphism-lite

- **Color Palette Evolution**:
  - If keeping **Dark Mode**: Soften the extreme blacks. Consider a "Midnight Blue" or "Charcoal" base instead of pure slate. Update the primary accent to a more vibrant, modern green or introduce a secondary accent (like a soft electric blue or vibrant indigo) to break the monotony.
  - If switching to **Light Mode** (or adding a toggle for freshness): Use `#F8FAFC` (Slate 50) for the background, `#FFFFFF` for cards, and ensure text contrast is high (`#0F172A` for primary text).

- **Typography**: 
  - `Plus Jakarta Sans` is excellent and modern. Ensure a strong hierarchy. 
  - *Recommendation*: Use font-weight `700` or `800` for main numbers/stats, and `500` for labels. Increase tracking (letter-spacing) on uppercase badges.

- **Component Refinements**:
  - **Cards**: Reduce border opacity. Instead of heavy solid borders, use a very subtle 1px border `rgba(255, 255, 255, 0.05)` coupled with a soft inner shadow or gradient border to make elements pop without looking boxed in.
  - **Glass Effect**: Ensure the glassmorphism isn't too dark. Increase background lightness slightly for contrast against the app background.
  - **Hover States**: Make them smooth. Avoid layout shifts. Use `transition-all duration-300 ease-out`.

## 4. Strict UI/UX Rules to Follow

Please adhere to these rules during the redesign to maintain professional quality:

1. **Icons & Visuals**:
   - Strictly use `lucide-react` icons (SVG-based). **No emojis** as UI elements.
   - Maintain consistent icon sizing, typically `w-5 h-5` or `w-6 h-6`.

2. **Interaction & Feedback**:
   - Ensure all interactive elements (buttons, cards, links) have a `cursor-pointer`.
   - Provide clear, stable hover states (e.g., color/opacity shifts, soft shadows) rather than scaling that causes layout shifts.

3. **Accessibility & Contrast**:
   - If introducing a Light Mode, never use `#94A3B8` (Slate 400) for body text; use `#475569` (Slate 600) minimum for contrast readability.
   - Ensure floating navbars or sidebars have proper spacing and do not hide underlying content.

4. **Spacing & Layout**:
   - Maximize whitespace. "Fresh" designs breathe. Increase internal padding on cards (`p-6` or `p-8` instead of `p-4`).
   - Use consistent border radii. The current `0.75rem` (`rounded-xl`) is good; consider pushing to `1rem` (`rounded-2xl`) for softer, friendlier edges.

## 5. Next Steps for Implementation
1. Analyze this document and decide on the exact color palette (Dark vs. Light/Dark combo).
2. Update `tailwind.config.js` and `globals.css` to refine the color tokens and component classes (like `.glass-card` and `.btn`).
3. Iterate over `layout.tsx` and main page components to apply the new spacing and refined classes.
