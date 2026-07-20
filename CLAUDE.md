@AGENTS.md

# CLAUDE.md — River

River es una app **personal y local** (un solo usuario, sin cuentas) para registrar la línea de vida de temas, ideas, feedback y decisiones. El documento fundacional es `river-plan.md`: leerlo completo antes de tocar código. La dirección visual definitiva está en `river-wireframe-board-v3.html`.

## Reglas del sistema (inviolables)

1. **El historial solo crece, nunca se reescribe.** Los eventos son inmutables: sin UPDATE ni DELETE sobre la tabla `events`, jamás.
2. **Las entries se editan, no se borran.** Editar siempre está permitido; queda marcada como "editado" con fecha (`edited_at`). Borrar solo mientras la entry está en el inbox (antes de pertenecer a un topic). Si la entry está citada como fuente de una decisión, al editarla se guarda el texto anterior en `entry_revisions`.
3. **Nada se archiva sin motivo.** Motivo obligatorio al archivar topics y threads. La UI no permite saltearlo; el backend lo valida también.
4. **Estado ≠ historial.** El estado (`active` | `snoozed` | `archived`) es un campo mutable; la historia son eventos inmutables. Cada cambio de estado genera su evento.
5. **Profundidad máxima 2**: topic → thread → subthread. Validar en backend, no solo en UI.
6. **Las versiones son del producto, no de los topics.** Un topic se estampa "Shipped en vX.Y", nunca tiene versión propia.
7. **Captura sin fricción.** Capturar una entry nunca exige decidir dónde va: existe un inbox para procesar después.
8. **Un solo usuario, local.** Sin auth, sin sync, sin multiusuario. Los datos viven en `river.db` (SQLite local, gitignoreado); backup = copiar el archivo.
9. **Los threads tienen estado y disparador propios**, independientes del topic padre.
10. **Dark mode exclusivo en la v1.** Una sola paleta oscura definida en `:root`. Sin light mode, sin toggle, sin `next-themes`, sin clase `dark` condicional, sin variantes claras "por si acaso".

## Vocabulario oficial (usar estos términos en código y UI)

**Topic** (unidad mayor, tiene un **main**) · **Thread** (ramificación de un topic) · **SubThread** (ramificación de un thread, tope de anidación) · **Entry** (registro escrito por el usuario; `author_label` libre para citar gente: "Martina") · **Evento** (registro inmutable que estampa el sistema) · **Estado** (`active`/`snoozed`/`archived`; responde "¿qué hacemos con esto AHORA?") · **Historial** (secuencia de eventos; responde "¿qué le pasó?") · **Disparador** (fecha | condición | backlog) · **Reentry** (momento en que un disparador se cumple: la app pregunta "¿esto sigue teniendo sentido hoy?" — reactivar, re-dormir o archivar) · **Convergence** (acción que une 2+ topics/threads; orígenes → archived con motivo autocompletado + link bidireccional) · **Shipped** (evento con versión del producto, no cambia estado) · **Decisión** (evento con fuentes citadas en `event_sources`).

**Decisión ≠ Shipped**: la decisión es el pensamiento, Shipped es la ejecución. Ninguno implica al otro. Una decisión puede ser "no hacer X" y jamás shippearse.

Regla práctica: si el usuario quiere ponerle disparador, no es `archived`, es `snoozed`.

## Stack y convenciones

- Next.js (App Router) + TypeScript. Frontend y API en un solo proyecto, corre con `npm run dev`.
- SQLite vía Drizzle ORM (`db/schema.ts`); archivo `river.db` en la raíz. Nombres de tablas/campos en inglés, snake_case.
- Tailwind CSS + shadcn/ui (componentes copiados al repo, editables).
- Textos de UI en español; código en inglés.
- Scripts: `npm run db:reset` (recrea la DB y la puebla con el caso de ejemplo dark-mode/Martina).

## Cómo trabajar

- **Una fase por sesión** (fases en `river-plan.md` §6). No avanzar a la siguiente sin cumplir el criterio de listo. Al final de cada fase: commit con mensaje descriptivo y mostrar el log.
- El usuario no es programador: explicar cada paso en lenguaje simple, qué se hizo y por qué, como una clase de programación.
- Si algo se rompe, no borrar nada: volver al último commit que funcionaba.
