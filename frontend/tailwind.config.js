/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cool slate, not pure black -- pure #000 reads flat under UI chrome.
        base: "#0B0D10",
        panel: "#14171B",
        "panel-raised": "#181C21",
        hairline: "#23272C",
        ink: "#EDEFF1",
        "ink-muted": "#8A9099",
        "ink-faint": "#5A6069",
        // Matches the reference dashboards: one warm accent carries every
        // action and every "needs attention" state (buttons, active nav,
        // flagged mismatches) -- exactly the single-bright-accent pattern
        // those screenshots use. Green is kept separate and used sparingly,
        // only for "matched/healthy," the same way the reference image
        // uses a small green "+8%" next to an otherwise orange UI.
        brand: {
          DEFAULT: "#F2703C",
          dim: "#45291A",
        },
        ok: {
          DEFAULT: "#34D399",
          dim: "#143829",
        },
      },
      fontFamily: {
        // UI text, labels, table content. Satoshi first -- only resolves if
        // you've dropped the real files in public/fonts (see globals.css);
        // Manrope (bundled, open-source) is what actually renders today.
        sans: ["Satoshi", "Manrope Variable", "ui-sans-serif", "system-ui", "sans-serif"],
        // Monetary figures only. Editorial New first, Fraunces as the
        // bundled fallback -- same reasoning as above.
        display: ["'Editorial New'", "Fraunces Variable", "ui-serif", "Georgia", "serif"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.4" }],
        sm: ["0.8125rem", { lineHeight: "1.5" }],
        base: ["0.9375rem", { lineHeight: "1.6" }],
        lg: ["1.125rem", { lineHeight: "1.5" }],
        xl: ["1.375rem", { lineHeight: "1.4" }],
        "2xl": ["1.75rem", { lineHeight: "1.3" }],
        "3xl": ["2.25rem", { lineHeight: "1.2" }],
      },
      borderRadius: {
        // A touch more rounded than a typical ops tool -- matches the
        // softer card look in the reference images -- but one radius,
        // used consistently everywhere, not a different value per component.
        DEFAULT: "10px",
      },
      boxShadow: {
        none: "none",
      },
    },
  },
  plugins: [],
};
