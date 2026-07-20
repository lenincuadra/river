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

## Acciones

5. **Las acciones de una misma cosa van juntas, en un solo lugar.** Nada de
   botones repartidos por la página.
6. **Si el espacio se achica, colapsan a un menú ⋯** (dropdown) en vez de
   apilarse o romper el layout. Los diálogos que abre el menú se controlan
   desde afuera para sobrevivir al cierre del menú.
7. **Sin líneas divisorias dentro de las cards** para separar contenido de
   acciones: solo aportan ruido. La separación la da el espaciado.

## Layout

8. **Las vistas de lista (Inbox, Radar, Reentry) comparten anatomía**: mismo
   ancho de página, fecha arriba a la derecha de cada card, acciones abajo.
9. **En mobile, las colecciones horizontales son carrusel**: una card por
   pantalla con la siguiente asomando, scroll-snap, y el corte en el **borde
   del viewport** (sin padding que lo enmarque).
10. Los formularios largos van en diálogos; la captura rápida y el compositor
    del timeline son la excepción: siempre a un tecleo de distancia.

## Sistema

11. Dark mode exclusivo (regla 10 de CLAUDE.md). Íconos siempre Lucide, nunca
    glifos ni emoji. Textos de UI en español, código en inglés.
12. Mapa semántico de color: entry = verde (`add`), thread/merge = morado
    (`merge`), fuentes/disparadores = rosa (`src`), destructivo = `del`.
