# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A custom Shopify theme for the Al'ard UK store (alardproducts.co.uk), selling Palestinian dates and food products. It is a heavily modified version of Shopify's Dawn theme with Arabic/RTL support and a multi-store geo-redirect system.

## Development commands

Use the Shopify CLI to work with this theme:

```bash
# Authenticate with Shopify
shopify auth login

# Start local development server (live preview with hot reload)
shopify theme dev --store=alard-uk.myshopify.com

# Push local changes to the live theme
shopify theme push

# Pull latest theme files from Shopify
shopify theme pull

# Push to a specific theme (by ID) without publishing
shopify theme push --theme=<theme-id> --only assets/ sections/ snippets/
```

There is no build step — assets are plain CSS and JavaScript, deployed directly.

## Architecture

### Directory layout

- `layout/theme.liquid` — The single master layout wrapping all pages. Loads global JS (`constants.js`, `pubsub.js`, `global.js`) and defines CSS custom properties from theme settings. Contains a special Pareto app script removal block for `/dates` routes.
- `sections/` — Modular page sections. Each section loads its own CSS inline via `stylesheet_tag`. Sections are assembled into pages through JSON template files.
- `templates/` — JSON files (e.g. `product.json`, `index.json`) that declare which sections appear on each page type. Custom page templates use the `page.<handle>.json` naming convention.
- `snippets/` — Reusable Liquid partials rendered with `{% render %}`. Icon snippets (`icon-*.liquid`) are SVG inlines.
- `assets/` — Flat directory of CSS, JavaScript, fonts, and images. No bundler.
- `locales/` — Translation strings. `en.default.json` is the primary locale; `ar.json` covers Arabic.
- `config/settings_schema.json` — Defines theme settings available in the Shopify customizer. `settings_data.json` holds saved values.
- `.shopify/metafields.json` — Metafield definitions synced to Shopify.

### JavaScript architecture

The theme uses a **pub/sub event bus** (`pubsub.js`) for cross-component communication — call `subscribe(eventName, callback)` and `publish(eventName, data)`. Components coordinate (e.g. cart updates, variant changes) through named events rather than direct coupling.

Interactive UI components are built as **Custom Elements** (Web Components): `CartDrawer`, `CartItems`, `ProductForm`, `QuickAddModal`, `PredictiveSearch`, etc. Each is defined in its own file in `assets/`.

Core utilities live in `global.js`: `trapFocus`, `removeTrapFocus`, `getFocusableElements`, `onKeyUpEscape`.

### Arabic/RTL support

Many components have two CSS files — a default (LTR) and an `-ar` variant (RTL). Sections switch between them by checking `localization.language.iso_code`:

```liquid
{%- if localization.language.iso_code == "en" -%}
  {{ 'component-slider.css' | asset_url | stylesheet_tag }}
{%- else -%}
  {{ 'component-slider-ar.css' | asset_url | stylesheet_tag }}
{%- endif -%}
```

`base.css` covers LTR; `base-ar.css` overrides for Arabic RTL layout. When adding new styles that differ by direction, follow this same pair pattern.

### Geo-redirect and multi-store network

`snippets/geo-redirect.liquid` handles automatic redirection based on IP geolocation (via `ipapi.co`) and a manual store selector UI injected into the header. The store network is:

| Region | Domain |
|--------|--------|
| UK (this store) | alardproducts.co.uk |
| USA / Canada | alardproducts.com |
| KSA / UAE / Gulf | alardsaudi.com |
| Palestine / Jordan / Israel | alardproducts.ps |
| Europe | alardproducts.eu |
| Hong Kong / China | alardproducts.hk |

Geo data is cached in `localStorage` under the key `alardGeoRedirect`. The manual store selection is stored under `alardSelectedStore`. To disable auto-redirect during development, add `?no_geo_redirect` to the URL.

### Notable customisations

- **Pareto app suppression on `/dates`**: `layout/theme.liquid` strips Pareto limit-purchase scripts/styles when the request path contains `dates`, because the dates product line uses a different purchase-limit strategy.
- **Build-your-box**: Integrated via the Easify Box Builder app. Products expose a `_easifyBoxBuilder.url` metafield pointing to the builder URL.
- **Slick carousel**: Loaded from CDN (`slick-carousel@1.8.1`) in `theme.liquid` for slider sections.
- **Smile loyalty**: Shop-level metafield `smile.channel_key` used by Smile app extensions.
- **Google Shopping**: Products and variants carry `mm-google-shopping` namespace metafields for feed attributes.
