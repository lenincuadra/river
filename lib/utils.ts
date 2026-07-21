import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Carrusel full-bleed (UI.md §5c): rompe el contenedor centrado y ocupa TODO
// el ancho del viewport. `(100vw - 100%)/2` es exactamente el gutter entre el
// borde del viewport y el contenido, así el margen negativo expande a los
// bordes y el padding vuelve a alinear la primera card con el contenido. El
// scroll horizontal sobrante lo recorta `overflow-x-clip` del body. Sin
// scroll-snap: con leading padding el snap fuerza un scroll inicial que se
// come el padding y desalinea la primera card (Chromium).
export const FULL_BLEED =
  "-mx-[calc((100vw_-_100%)/2)] px-[calc((100vw_-_100%)/2)]"
