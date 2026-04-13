/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      fontFamily: {
        inter: ['var(--font-inter)'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        vault: {
          DEFAULT: 'hsl(var(--vault))',
          foreground: 'hsl(var(--vault-foreground))'
        },
        guard: {
          DEFAULT: 'hsl(var(--guard))',
          foreground: 'hsl(var(--guard-foreground))'
        },
        liquidity: {
          DEFAULT: 'hsl(var(--liquidity))',
          foreground: 'hsl(var(--liquidity-foreground))'
        },
        recovery: {
          DEFAULT: 'hsl(var(--recovery))',
          foreground: 'hsl(var(--recovery-foreground))'
        },
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}