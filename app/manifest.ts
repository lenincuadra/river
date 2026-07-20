import type { MetadataRoute } from "next";

// Con esto el celular puede "Agregar a pantalla de inicio" y River se abre
// como app propia (pantalla completa, sin barra del navegador).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "River",
    short_name: "River",
    description: "The only source of truth",
    start_url: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
