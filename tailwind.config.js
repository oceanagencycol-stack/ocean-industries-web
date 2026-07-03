/** @type {import('tailwindcss').Config} */
// Config de Tailwind para compilar el CSS estático del sitio (npm run build:css).
// Reemplaza al CDN de cdn.tailwindcss.com: mismo tema, cero JS en runtime.
export default {
  content: ["./index.html"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Archivo"', '"Inter"', "sans-serif"],
        body: ['"Inter"', "sans-serif"],
      },
      colors: {
        ocean: {
          blue: "#0000FF",
          bluedeep: "#0B1F8C",
          green: "#00FF7F",
          greensoft: "#5BE69A",
          black: "#101820",
          ink: "#0a0f16",
          white: "#F4F5F0",
        },
      },
      // El HTML usa font-700/font-800/font-900 (no existen por defecto en Tailwind).
      // Sin estas llaves, todos los titulares renderizan en peso 400.
      fontWeight: {
        700: "700",
        800: "800",
        900: "900",
      },
    },
  },
  plugins: [],
};
