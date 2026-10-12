import { heroui } from "@heroui/theme";

// Paleta de marca MicroMarket: naranja (energía/frescura de mercado) + verde agua (frescura/producto)
const primary = {
  50: "#fff7ed",
  100: "#ffedd5",
  200: "#fed7aa",
  300: "#fdba74",
  400: "#fb923c",
  500: "#f97316",
  600: "#ea580c",
  700: "#c2410c",
  800: "#9a3412",
  900: "#7c2d12",
  950: "#431407",
  DEFAULT: "#f97316",
  foreground: "#ffffff",
};

const secondary = {
  50: "#f0fdfa",
  100: "#ccfbf1",
  200: "#99f6e4",
  300: "#5eead4",
  400: "#2dd4bf",
  500: "#14b8a6",
  600: "#0d9488",
  700: "#0f766e",
  800: "#115e59",
  900: "#134e4a",
  950: "#042f2e",
  DEFAULT: "#14b8a6",
  foreground: "#ffffff",
};

export default heroui({
  themes: {
    light: {
      colors: {
        primary,
        secondary,
        focus: primary[500],
      },
    },
  },
});
