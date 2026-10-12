import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { blue: { DEFAULT: "#2B3CFF", 600: "#2332DB" }, ignite: "#FF6A2B", lilac: "#C7CCFF", paper: "#F5F3EE", slate: "#6B7092", ink: "#14162B" },
      fontFamily: { sans: ["Outfit", "Poppins", "system-ui", "sans-serif"] },
      borderRadius: { xl: "16px", "2xl": "22px" },
    },
  },
  plugins: [],
} satisfies Config;
