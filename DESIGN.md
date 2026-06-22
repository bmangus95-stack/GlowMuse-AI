# Warm Neutrals Design System

A grounded, warm, editorial design system built from the Warm Neutrals palette. Soft creams, sand, camel, and clay. Calm and confident, never loud. Suited to a lifestyle brand for women in their reinvention chapter.

## Color palette

### Core swatches (from source)

| Token | Hex | Role |
|-------|-----|------|
| `--cream` | `#F1E8DC` | Lightest. Page background, large empty space |
| `--linen` | `#EAD7C0` | Surface, cards, raised panels |
| `--sand` | `#D1B299` | Secondary fills, muted buttons, borders |
| `--taupe` | `#C5A388` | Calm neutral, dividers, captions, hover states |
| `--camel` | `#BB9772` | Primary brand color, headings, primary buttons |
| `--clay` | `#B58868` | Accent. Calls to action, highlights, links |

### Derived neutrals (for contrast and text)

| Token | Hex | Role |
|-------|-----|------|
| `--espresso` | `#3D2E22` | Primary text on light backgrounds |
| `--cocoa` | `#6B5341` | Secondary text, body copy |
| `--mushroom` | `#9A8369` | Muted text, placeholders, disabled |
| `--white` | `#FBF7F1` | True surface for inputs and cards on cream |

### Functional states (warm tuned)

| Token | Hex | Role |
|-------|-----|------|
| `--success` | `#7E8B5E` | Confirmations, sage tuned to the warm family |
| `--warning` | `#C98A3C` | Caution, amber |
| `--error` | `#A85A4A` | Errors, brick |

## Contrast and accessibility

Use `--espresso` or `--cocoa` for body text on `--cream`, `--linen`, and `--white`. These pass readable contrast. Do not put `--mushroom` or `--sand` text on `--cream`, the contrast is too low for body copy, reserve those for large display type or decorative labels only. For text on `--camel` or `--clay` buttons, use `--white`.

## Typography

Two families. A script for display moments and a clean sans for everything functional.

### Families

Display script: "Cormorant Garamond" italic as a refined stand in for the hand script in the source, or "Dancing Script" for a closer match. Use sparingly, for hero words and section titles only.

Body and UI: "Montserrat", a calm geometric sans. Used for all paragraphs, labels, buttons, and navigation.

### Type scale

| Token | Size | Line height | Use |
|-------|------|-------------|-----|
| `--display` | 64px | 1.1 | Hero word, one per screen |
| `--h1` | 40px | 1.2 | Page title |
| `--h2` | 30px | 1.25 | Section title |
| `--h3` | 22px | 1.3 | Card title |
| `--body-lg` | 18px | 1.6 | Lead paragraph |
| `--body` | 16px | 1.6 | Default text |
| `--small` | 14px | 1.5 | Captions, helper text |
| `--label` | 12px | 1.4 | Uppercase labels, letter spacing 0.18em |

### Label treatment

The "COLOR PALETTE" look from the source. Uppercase, 12px, letter spacing 0.18em, color `--cocoa`, often with a short rule on each side.

## Spacing

Base unit is 8px. Scale: 4, 8, 16, 24, 32, 48, 64, 96.

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 16px |
| `--space-4` | 24px |
| `--space-5` | 32px |
| `--space-6` | 48px |
| `--space-7` | 64px |
| `--space-8` | 96px |

## Radius and elevation

Soft, rounded, organic. Nothing sharp.

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 8px | Inputs, small chips |
| `--radius-md` | 16px | Buttons, cards |
| `--radius-lg` | 24px | Panels, hero blocks |
| `--radius-full` | 999px | Pills, avatars |

Shadows are warm and low. Use a brown tint, never pure black.

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(61, 46, 34, 0.08)` |
| `--shadow-md` | `0 6px 20px rgba(61, 46, 34, 0.10)` |
| `--shadow-lg` | `0 16px 40px rgba(61, 46, 34, 0.14)` |

## Components

### Buttons

Primary: background `--clay`, text `--white`, radius `--radius-md`, padding 14px by 28px. Hover darkens toward `--camel`.

Secondary: background `--linen`, text `--espresso`, 1px border `--sand`. Hover background `--sand`.

Text link: color `--clay`, underline on hover.

### Cards

Background `--white` or `--linen`, radius `--radius-lg`, shadow `--shadow-md`, padding `--space-5`. Title in `--h3` `--espresso`, body in `--body` `--cocoa`.

### Inputs

Background `--white`, 1px border `--sand`, radius `--radius-sm`, padding 12px by 16px. Focus border `--clay` with a soft ring `0 0 0 3px rgba(181, 136, 104, 0.25)`. Placeholder `--mushroom`.

### Chips and tags

Pill shape, background `--linen`, text `--cocoa`, small label type.

## Voice pairing

This system reads warm, grounded, and unhurried. It matches first person lived experience copy. Keep layouts airy with generous space. Let the cream breathe. Use the script display font for one emotional word per view, then let the calm sans carry the rest.
