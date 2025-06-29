/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "system-ui", "sans-serif"],
        atkinson: ['"Atkinson Hyperlegible"', "sans-serif"],
        blinker: ['"Blinker"', "sans-serif"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1" }],
        "6xl": ["3.75rem", { lineHeight: "1" }],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        128: "32rem",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Eco-Conscious Brand Colors
        eco: {
          primary: "#4CAF50", // Natural Green
          forest: "#2F4F4F", // Forest Green/Charcoal
          soft: "#FAFAFA", // Soft White
          beige: "#F5F5DC", // Warm Beige
          coral: "#FFB6B6", // Light Coral
          "forest-light": "#3A5A5A", // Lighter forest for dark mode cards
          "text-soft": "#F1F1F1", // Soft white for dark mode text
        },
        // TABADOL Brand Colors (Legacy)
        tabadol: {
          primary: "#4CAF50", // Updated to eco primary
          violet: {
            light: "#A259FF",
            dark: "#6A0572",
          },
          gold: "#FFD700",
          black: "#000000",
          white: "#FFFFFF",
        },
        // Legacy colors for backward compatibility
        "tabadol-purple": "#4CAF50", // Updated to eco primary
        "tabadol-orange": "#F5F5DC", // Updated to eco beige
        success: "#4CAF50",
        warning: "#FFB6B6",
        danger: "#EF4444",
        info: "#4CAF50",
      },
      backgroundImage: {
        "gradient-eco":
          "linear-gradient(135deg, #4CAF50 0%, rgba(76, 175, 80, 0.8) 50%, rgba(76, 175, 80, 0.6) 100%)",
        "gradient-eco-hover":
          "linear-gradient(135deg, rgba(76, 175, 80, 0.9) 0%, #4CAF50 50%, rgba(76, 175, 80, 0.7) 100%)",
        "gradient-forest": "linear-gradient(135deg, #2F4F4F 0%, #3A5A5A 100%)",
        "gradient-soft":
          "linear-gradient(135deg, #FAFAFA 0%, rgba(250, 250, 250, 0.8) 100%)",
        "gradient-overlay":
          "linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, transparent 50%, rgba(250, 250, 250, 0.05) 100%)",
        "gradient-success": "linear-gradient(135deg, #4CAF50 0%, #45A049 100%)",
        "gradient-warning": "linear-gradient(135deg, #FFB6B6 0%, #FF9999 100%)",
        "gradient-danger": "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
        // Legacy gradients
        "gradient-tabadol":
          "linear-gradient(135deg, #4CAF50 0%, rgba(76, 175, 80, 0.8) 50%, rgba(76, 175, 80, 0.6) 100%)",
        "gradient-tabadol-hover":
          "linear-gradient(135deg, rgba(76, 175, 80, 0.9) 0%, #4CAF50 50%, rgba(76, 175, 80, 0.7) 100%)",
        "gradient-gold": "linear-gradient(135deg, #F5F5DC 0%, #F0F0DC 100%)",
        "gradient-gold-hover":
          "linear-gradient(135deg, #F0F0DC 0%, #F5F5DC 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glow: "0 0 20px rgba(76, 175, 80, 0.3)",
        "glow-eco": "0 0 25px rgba(76, 175, 80, 0.4)",
        "glow-soft": "0 0 15px rgba(76, 175, 80, 0.2)",
        soft: "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
        floating: "0 10px 30px rgba(0, 0, 0, 0.1)",
        "floating-hover": "0 15px 40px rgba(0, 0, 0, 0.15)",
        premium:
          "0 8px 32px rgba(76, 175, 80, 0.12), 0 2px 16px rgba(0, 0, 0, 0.08)",
        infinity:
          "0 20px 60px rgba(76, 175, 80, 0.08), 0 8px 25px rgba(0, 0, 0, 0.06)",
        // Legacy shadows
        "glow-gold": "0 0 20px rgba(245, 245, 220, 0.3)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(143, 0, 255, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(143, 0, 255, 0.5)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
