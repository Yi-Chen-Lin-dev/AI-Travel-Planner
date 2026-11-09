import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00BCD4", 
        "on-primary": "#ffffff",
        "primary-container": "#cbe6ff",
        "on-primary-container": "#001e30",
        secondary: "#F26419", 
        "on-secondary": "#ffffff",
        "secondary-container": "#ffdbd1",
        "on-secondary-container": "#360f00",
        tertiary: "#1a2942", 
        "on-tertiary": "#ffffff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f8f9fa",
        "surface-container": "#f1f3f5",
        "surface-container-high": "#e9ecef",
        "surface-container-highest": "#dee2e6",
        surface: "#F4F1EA", 
        "on-surface": "#212529",
        "on-surface-variant": "#495057",
        outline: "#ced4da",
        "outline-variant": "#e9ecef",
        "inverse-surface": "#343a40",
        "inverse-on-surface": "#f8f9fa",
      },
      spacing: {
        'space-xs': '4px',
        'space-sm': '8px',
        'space-md': '16px',
        'space-lg': '24px',
        'space-xl': '32px',
        'gutter': '24px',
        'margin': '32px',
      },
      fontSize: {
        'label-sm': '0.75rem',
        'label-md': '0.875rem',
        'body-sm': '0.875rem',
        'body-md': '1rem',
        'title-md': '1.125rem',
        'headline-sm': '1.5rem',
        'headline-md': '1.75rem',
        'headline-lg': '2rem',
      }
    },
  },
  plugins: [],
};
export default config;