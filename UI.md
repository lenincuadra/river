# UI.md — Principios de interfaz de River

La regla madre: **la UI tiene que ser muy simple de entender.** Ante la duda,
menos elementos, menos variantes, menos decoración. Este documento baja esa
regla a decisiones concretas; la dirección visual (paleta, tipografía, layout
de referencia) sigue viviendo en `river-wireframe-board-v3.html`, y las reglas
del sistema en `CLAUDE.md`.

## El timeline es la gramática central

1. **Afuera de una card queda solo el ícono** del timeline: dice qué es cada
   cosa (entry, decisión, evento) y de dónde viene. Todo lo demás — autor,
   fecha, "editado", acciones — vive **adentro** de la card.
2. **La línea vertical es continua**: nace en el primer item y llega hasta el
   compositor. Las acciones de "qué sigue" son filas del timeline
   (`FeedActionRow`), no bloques sueltos al fondo de la página.
3. **Un solo empty state al final del timeline.** Lo próximo que le pasa a la
   historia es UNA cosa: una entry, una decisión o un thread. Se elige con un
   selector; nunca se muestran dos formularios apilados.
4. Los eventos que ya cuenta el encabezado no se repiten en el feed
   (ej: "Creado" — el "desde {fecha}" del título ya lo dice).
5. **El contenido se ve donde está.** Las cards de threads muestran sus
   entries en la misma vista; abrir el thread sirve para aislarlo, no es la
   única forma de leerlo. El riel visual conecta los íconos de los threads
   entre sí y con su card, y **la línea del main continúa hacia abajo hasta
   ese riel**: el timeline es infinito, nunca queda cortado.
5b. **Un solo ícono de timeline**: cuadrado `size-6` con bordes redondeados
   (`TIMELINE_ICON` en `components/feed.tsx`), glifo `size-3.5` adentro. Mismo
   tamaño y forma en el feed, el riel y los CTAs. **Chips planos**: fondo
   `bg-muted` sólido (nunca tintes translúcidos tipo `bg-add/15`); el color
   semántico lo lleva el glifo (entry=verde, thread/merge=morado, etc.). El
   chip del compositor (`+`) usa `border-dashed`, igual que la card-template
   que acompaña. Los glifos de **thread y convergencia van espejados en
   vertical** (`ThreadIcon`/`ConvergeIcon` en `lib/event-icons.tsx`,
   `-scale-y-100`) porque el timeline fluye hacia abajo: el thread nace arriba
   y su rama baja a la derecha; la convergencia apunta hacia abajo, adonde
   confluyen las líneas. Son la única fuente de esos dos íconos — nunca
   `GitBranch`/`Merge` sueltos. La línea del feed **entra por debajo** de los
   chips (opacos, `z-[1]`), nunca se corta antes de llegar al riel.
5c. **Las ramificaciones nunca se apilan**: threads y subthreads siempre van
   al lado. Si no entran, la fila es un carrusel que ocupa **todo el ancho del
   viewport** (full-bleed, `FULL_BLEED` en `lib/utils.ts`) en cualquier
   tamaño de pantalla: rompe el contenedor centrado, la primera card queda
   alineada con el contenido y cierra con el CTA de crear, del mismo tamaño
   que una card.
   Los dos niveles comparten componente (`components/branch-carousel.tsx`) y
   compositor con la misma lógica (`main-composer.tsx` / `thread-composer.tsx`).

## Acciones

6. **Las acciones de una misma cosa van juntas, en un solo lugar.** Nada de
   botones repartidos por la página.
7. **Mostrá los botones, no los escondas.** Dos o tres acciones entran
   siempre (envuelven en angosto): van directas, sin `⋯`. El menú `⋯` es solo
   para cuando genuinamente no hay lugar; los diálogos que abre se controlan
   desde afuera para sobrevivir a su cierre.
8. **Sin líneas divisorias dentro de las cards** para separar contenido de
   acciones: solo aportan ruido. La separación la da el espaciado.
9. **Una card que lleva a algún lado se abre clickeando la card entera**
   (link estirado), no solo un texto con underline. Las acciones internas
   quedan por encima del link (`relative z-[1]`). En una card **editable**
   (una entry), el clic por defecto abre el editor —salvo que se clickee una
   acción explícita o se esté seleccionando texto.
10. Los empty states también accionan: ofrecen el siguiente paso como CTA
    (capturar desde el inbox, volver al inicio desde el radar despejado,
    elegir Entry/Thread/Decisión en el compositor). No desaparecen cuando
    hay contenido: se quedan debajo de los items con texto contextual
    (ej: el bloque de captura del inbox).

## Layout

11. **Las vistas de lista (Inbox, Radar, Reentry) comparten anatomía**: mismo
    ancho de página, fecha arriba a la derecha de cada card, acciones abajo.
12. **Todo carrusel es full-bleed**: ocupa el ancho completo del viewport en
    todos los tamaños (`FULL_BLEED`), rompiendo el contenedor centrado; la
    primera card se alinea con el contenido. En mobile cada card ocupa casi
    toda la pantalla con la siguiente asomando. (Sin scroll-snap: con el
    leading padding del full-bleed, el snap desalinea la primera card.)
13. **La captura vive en un modal**, siempre a un ⌘K de distancia desde
    cualquier pantalla; los demás formularios largos van en diálogos. El
    compositor del timeline es la otra excepción: vive en la página.
14. **Una colección se puede ver en Lista o en Columnas** (paralelo). En
    Columnas las cards van una junto a otra —el mismo carrusel a sangre de
    las ramas— y cada una muestra sus entries. Home ofrece el toggle
    (`?view=list|columns`).

## Sistema

11. Dark mode exclusivo (regla 10 de CLAUDE.md). Íconos siempre Lucide, nunca
    glifos ni emoji. Textos de UI en español, código en inglés.
12. Mapa semántico de color: entry = verde (`add`), thread/merge = morado
    (`merge`), fuentes/disparadores = rosa (`src`), destructivo = `del`.
