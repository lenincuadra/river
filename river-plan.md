# River — Plan de construcción

> Este archivo es el documento fundacional del proyecto. Está pensado para dárselo a Claude Code al inicio: contiene la definición del producto, el vocabulario oficial, el modelo de datos, el stack y las fases de construcción. Instrucción para Claude Code: leer este documento completo antes de escribir código, y derivar de la sección "Reglas del sistema" un archivo CLAUDE.md para el repo.

---

## 1. Qué es River

River es una app **personal y local** (un solo usuario, sin cuentas, sin equipo) para registrar la línea de vida de temas, ideas, feedback y decisiones. Su valor central: el historial nunca se reescribe, solo crece. Cada tema queda trazable desde que alguien lo mencionó hasta que se concretó, se archivó con motivo, o quedó dormido esperando su momento. River responde preguntas como: "¿cómo llegamos a esta decisión?", "¿alguien ya mencionó esta idea y por qué no se hizo?", "¿qué temas dormidos deberían despertar hoy?".

Aplica a productos (features, releases) pero también a ideas, conceptos o cualquier línea de pensamiento personal.

---

## 2. Vocabulario oficial (usar estos términos en código y UI)

| Término | Definición |
|---|---|
| **Topic** | La unidad mayor. Un tema con su propia línea de vida. Tiene un **main** (su línea temporal principal). |
| **Thread** | Ramificación de un topic: un debate o vertiente específica. Tiene su propio estado y disparador, independiente del topic padre. |
| **SubThread** | Ramificación de un thread. **Profundidad máxima: 2 niveles** (topic → thread → subthread). No se permite más anidación. |
| **Entry** | La unidad atómica: un registro escrito por el usuario. Puede ser una opinión propia, una idea, o feedback ajeno citado (ej: "Martina: X"). Siempre la escribe el usuario; no hay multiusuario. |
| **Evento** | Registro que el sistema estampa solo (snoozed, despertó, shipped, convergió). **Inmutable: nunca se edita ni se borra.** Vive intercalado cronológicamente con las entries en el main. |
| **Main** | La línea temporal principal de un topic: entries + eventos en orden cronológico. Los threads se ramifican desde entries del main. |
| **Estado** | Responde "¿qué estamos haciendo con esto AHORA?". Valores: `active`, `snoozed`, `archived`. Aplica a topics y a threads por separado. |
| **Historial** | Responde "¿qué le pasó a esto?". Es la secuencia de eventos. Estado e historial son cosas distintas y no deben mezclarse. |
| **Disparador** | Lo que despierta algo dormido. Tres tipos: **fecha** ("revisar el 3 oct"), **condición** ("si llegamos a 10k usuarios") o **backlog** (sin disparador, solo revisión manual). |
| **Reentry** | El momento (no estado) en que un disparador se cumple. La app NO dice "hacelo": pregunta **"¿esto sigue teniendo sentido hoy?"**. Salidas: reactivar, volver a dormir con nuevo disparador, o archivar con motivo. |
| **Convergence** | Acción (no estado) que une 2+ topics/threads en uno (nuevo o existente). Los orígenes pasan a `archived` con motivo autocompletado ("convergió en X") y queda link bidireccional. |
| **Shipped** | Evento (no estado): "esto se concretó", estampado con versión del producto (`Shipped en v2.0`). Un topic puede tener el evento Shipped y aún así estar `snoozed` o `active` hoy: el ciclo se extiende, no se reinicia. |
| **Decisión** | Evento con **fuentes citadas**: registra qué se decidió y qué lo alimentó. Las fuentes son cualquier combinación de 1..N threads o subthreads (incluso varios del mismo thread). Es la respuesta directa a "¿cómo llegamos a X decisión?". |

**Decisión ≠ Shipped.** Son dos ejes distintos y ninguno implica al otro: la decisión es el *pensamiento* (qué se resolvió y con qué fundamentos), Shipped es la *ejecución* (se concretó, con versión estampada). Se puede decidir algo y no shippearlo nunca (queda despriorizado, o se revierte); se puede shippear algo sin decisión formal (un arreglo menor); y entre una y otra suelen pasar semanas o meses. El caso que lo deja más claro: **una decisión puede ser "no hacer X"**, y eso nunca se shippea, pero es exactamente lo que hay que poder consultar dentro de dos años. Cuando una decisión sí se concreta, el evento `shipped` puede linkearla vía `decision_id` y ahí se cierra el círculo.

### Estados en detalle

- `active`: se está discutiendo/trabajando ahora.
- `snoozed`: "todavía creo en esto, pero no es ahora". Duerme esperando su disparador (o en backlog). Va a golpear la puerta solo.
- `archived`: "dejé de creer en esto, y este es el motivo". No espera nada, pero es reversible manualmente. **Motivo obligatorio, siempre.**

Regla práctica: si el usuario quiere ponerle disparador, no es archived, es snoozed.

---

## 3. Reglas del sistema (de acá sale el CLAUDE.md)

1. **El historial solo crece, nunca se reescribe.** Los eventos son inmutables: sin UPDATE ni DELETE sobre la tabla de eventos, jamás.
2. **Las entries se editan, no se borran.** Editar una entry está permitido siempre (completar, corregir); queda marcada como "editado" con fecha. Borrar solo se permite mientras la entry está en el inbox, es decir antes de formar parte de la historia de un topic. Si la entry está citada como fuente de una decisión, al editarla se guarda el texto anterior en `entry_revisions`: la decisión debe poder mostrar en qué se apoyó cuando se tomó.
3. **Nada se archiva sin motivo.** El campo motivo es obligatorio al archivar (topics y threads). La UI no permite saltearlo.
4. **Estado ≠ historial.** El estado es un campo mutable; la historia son eventos inmutables. Cada cambio de estado genera su evento.
5. **Profundidad máxima 2** (topic → thread → subthread). Validar en backend, no solo en UI.
6. **Las versiones son del producto, no de los topics.** Un topic se estampa "Shipped en vX.Y", nunca tiene versión propia.
7. **Captura sin fricción.** Capturar una entry nunca puede exigir decidir dónde va: existe un inbox para procesar después.
8. **Un solo usuario, local.** Sin auth, sin sync, sin multiusuario. Los datos viven en un archivo SQLite local fácil de respaldar.
9. Los threads tienen estado y disparador propios, independientes del topic padre.
10. **Dark mode exclusivo en la v1.** La app se construye solo en modo oscuro: sin light mode, sin toggle de tema, sin detección de preferencia del sistema. Se define una única paleta oscura y se usa esa. No implementar variantes claras "por si acaso": duplica el trabajo de estilos y no se va a usar.

---

## 4. Modelo de datos

SQLite. Nombres en inglés, snake_case.

### `topics`
| Campo | Tipo | Notas |
|---|---|---|
| id | text (uuid) | PK |
| title | text | requerido |
| description | text | opcional |
| state | text | `active` \| `snoozed` \| `archived` |
| origin_entry_id | text \| null | FK → entries. La entry que originó el topic (ej: la nota donde cité a Martina). Null si nació directo. |
| created_at | datetime | |

### `threads`
| Campo | Tipo | Notas |
|---|---|---|
| id | text (uuid) | PK |
| topic_id | text | FK → topics |
| parent_thread_id | text \| null | null = thread; con valor = subthread. Validar profundidad máx 2. |
| title | text | requerido |
| state | text | igual que topics |
| origin_entry_id | text \| null | FK → entries. La entry desde la que se ramificó este thread. Permite mostrar "Thread creado desde una entry de Martina" y saber quién lo detonó. |
| created_at | datetime | |

### `entries`
| Campo | Tipo | Notas |
|---|---|---|
| id | text (uuid) | PK |
| topic_id | text \| null | null mientras está en inbox |
| thread_id | text \| null | null = vive en el main del topic |
| author_label | text | default "Yo"; libre para citar a otros ("Martina") |
| body | text | requerido |
| created_at | datetime | |
| edited_at | datetime \| null | las entries sí son editables (los eventos no). Si tiene valor, la UI muestra "editado". |

### `entry_revisions`
Snapshot del texto anterior cuando se edita una entry citada como fuente de una decisión.
| Campo | Tipo | Notas |
|---|---|---|
| id | text (uuid) | PK |
| entry_id | text | FK → entries |
| body | text | el texto que tenía antes de la edición |
| replaced_at | datetime | |

### `events` (inmutable)
| Campo | Tipo | Notas |
|---|---|---|
| id | text (uuid) | PK |
| topic_id | text | FK |
| thread_id | text \| null | si el evento es de un thread |
| type | text | `created` \| `snoozed` \| `awakened` \| `reactivated` \| `archived` \| `shipped` \| `decision` \| `converged_into` \| `converged_from` |
| payload | text (JSON) | motivo, versión, disparador, topic destino/origen, según type. En `shipped` puede incluir `decision_id` para linkear qué decisión materializa. |
| created_at | datetime | |

### `event_sources`
Fuentes citadas por un evento (usada por eventos `decision`; queda disponible para otros tipos si hace falta).
| Campo | Tipo | Notas |
|---|---|---|
| id | text (uuid) | PK |
| event_id | text | FK → events |
| source_type | text | `thread` \| `entry` |
| source_id | text | id del thread/subthread o entry citado |

### `triggers`
| Campo | Tipo | Notas |
|---|---|---|
| id | text (uuid) | PK |
| target_type | text | `topic` \| `thread` |
| target_id | text | |
| kind | text | `date` \| `condition` \| `backlog` |
| fire_date | datetime \| null | si kind = date |
| condition_text | text \| null | si kind = condition (se cumple manualmente) |
| status | text | `pending` \| `fired` \| `dismissed` |
| created_at | datetime | |

### Flujos clave

- **Snooze**: elegir disparador → state = snoozed → crear evento `snoozed` + fila en triggers.
- **Reentry**: al abrir la app se chequean triggers de fecha vencidos (los de condición los dispara el usuario). Cada uno abre la revisión "¿sigue teniendo sentido?" con tres salidas: reactivar (evento `reactivated`), re-dormir (nuevo trigger + evento `snoozed`), archivar (motivo obligatorio + evento `archived`). El trigger pasa a `fired`.
- **Shipped**: acción manual que pide versión (texto libre tipo "v2.0") y crea el evento. No cambia el estado por sí solo.
- **Decisión**: acción manual que crea evento `decision` con texto de lo decidido + selección de fuentes (1..N threads/subthreads/entries, cualquier combinación) que se guardan en `event_sources`. La UI del board resalta las fuentes y la card de decisión las lista como chips navegables.
- **Convergence**: seleccionar 2+ topics/threads → elegir o crear destino → evento `converged_from` en el destino (con orígenes) + evento `converged_into` en cada origen + orígenes pasan a archived con motivo autocompletado.

---

## 5. Stack

- **Next.js + TypeScript** (App Router): frontend y API en un solo proyecto, corre local con `npm run dev`.
- **SQLite** vía **Drizzle ORM** (o better-sqlite3 directo si Drizzle agrega fricción): un archivo `river.db` local, backup = copiar el archivo.
- **Tailwind CSS + shadcn/ui** para la UI. shadcn/ui no es una librería que se instala como dependencia: son componentes que se copian dentro del proyecto (botones, dropdowns, dialogs, inputs) y quedan editables. Encaja con la topbar, el switcher de topic, los dialogs de snooze/archive y los chips de estado. Configurar shadcn/Tailwind directamente en modo oscuro fijo: sin `next-themes`, sin clase `dark` condicional, sin variables para tema claro.
- Sin auth, sin deploy obligatorio. Si algún día se quiere en el celular, se evalúa recién ahí (deploy simple o PWA). **Actualización 19 jul 2026: ese día llegó; evaluado y decidido en §10.**

Justificación: es el stack que Claude Code maneja con más soltura, mínimo de piezas móviles, y todo local.

---

## 6. Fases de construcción

Trabajar **una fase por sesión** de Claude Code. No avanzar a la siguiente hasta cumplir el criterio de listo. Al final de cada fase: commit con mensaje descriptivo.

**Fase 0 — Esqueleto.** Proyecto Next.js + SQLite + esquema de tablas + datos de ejemplo (el caso dark-mode con Martina, tal cual el plan).
*Listo cuando:* la app corre local y muestra la lista de topics de ejemplo.

**Fase 1 — Topics y entries.** Crear topics, ver su main, agregar entries (con author_label editable para citar gente). Captura rápida global que cae al inbox + vista inbox para procesar (asignar entry a un topic).
*Listo cuando:* puedo capturar sin elegir destino y procesarlo después.

**Fase 2 — Threads.** Crear threads desde una entry del main, subthreads (máx 2 niveles, validado), entries dentro de threads.
*Listo cuando:* el caso "Martina trae dos debates en un mensaje" se puede partir en dos threads.

**Fase 3 — Estados y eventos.** Estados en topics y threads, eventos inmutables intercalados en el main, motivo obligatorio al archivar.
*Listo cuando:* archivar sin motivo es imposible y todo cambio de estado deja su evento visible en la línea de tiempo.

**Fase 4 — Disparadores y Reentry.** Snooze con fecha/condición/backlog. Al abrir la app, pantalla de Reentry con lo que despertó: "¿sigue teniendo sentido?" y sus tres salidas. Vista "radar" de todos los disparadores pendientes.
*Listo cuando:* un topic snoozeado con fecha vencida me interpela al abrir la app y puedo resolverlo por los tres caminos.

**Fase 5 — Shipped y Convergence.** Acción Shipped con versión estampada. Acción Convergence con links bidireccionales y archivado automático de orígenes.
*Listo cuando:* desde un topic viejo puedo navegar hasta dónde convergió, y viceversa.

**Fase 6 — Búsqueda y filtros.** Búsqueda por texto en entries/topics, filtros por estado, vista "qué se shippeó en cada versión".
*Listo cuando:* puedo responder "¿alguien ya mencionó esta idea?" en menos de 10 segundos.

**Fase 7 (opcional) — Vista Multiverso.** La vista timeline horizontal del wireframe B: main como línea, threads como ramas, zona futuro con disparadores. Es una vista alternativa del mismo topic, no otra estructura.

---

## 7. Identidad visual (branding)

**Nombre:** River. Sin sufijos, sin números en el nombre escrito o hablado.

**Logo/favicon:** monograma "1R" combinado, compartiendo el palo vertical entre el "1" y la "R" (un solo trazo hace de asta del 1 y de pierna izquierda de la R). El "1" no es decoración: encodea la tesis central de la app, "the only source of truth" / el único origen del que todo se ramifica y al que todo converge, la regla de que el historial nunca se reescribe, solo crece.

**Disciplina de uso:** el "1" vive solo en el isotipo y el favicon. No se repite en menús, botones ni headers de la interfaz — ahí el nombre se escribe simplemente "River". El gesto tipográfico debe seguir siendo una sorpresa cuando alguien lo nota, no ruido visual repetido.

**Pendiente:** bocetar el monograma en SVG cuando se llegue a la fase de UI definitiva (no bloquea las Fases 0–6 del plan técnico).

---

## 8. Dirección visual elegida (síntesis de wireframes)

Dirección definitiva (ver `river-wireframe-board-v3.html`): **todo desciende por jerarquía**.

- **Topbar en lugar de sidebar.** De izquierda a derecha: logo (monograma 1R), **captura rápida como input principal** (ancho, siempre listo, con atajo de teclado: capturar es la acción fundamental y requiere agilidad), inbox con badge, búsqueda plegada a un botón, y el **switcher de topic a la derecha** (el topic actual visible; al desplegarse muestra la lista enriquecida completa: agrupada por estado, con preview del último movimiento y disparador visible).
- **Captura contextual.** Sin topic seleccionado, lo capturado va al inbox sin asignación. Con un topic abierto, el input muestra un chip de destino (→ topic) y la entry se captura dentro de ese topic; quitar el chip la manda al inbox.
- **Board jerárquico como vista principal del topic (gramática GitHub).** Cada nivel usa el patrón del feed de actividad de GitHub (fila titular con ícono circular + card colgando de un spine vertical). El topic arriba a lo ancho; los threads lado a lado como columnas; **cada columna es un feed propio que crece hacia abajo** con su thread y sus subthreads apilados; las decisiones al final a lo ancho. Las cards crecen verticalmente lo que necesiten. Toda card puede abrirse individual, pero el valor del board es ver todos los niveles al mismo tiempo.
- **El riel (spine extendido).** El spine vertical de GitHub se extiende en horizontal para conectar niveles, **con exactamente el mismo estilo de trazo del spine** (sin punteados ni tratamientos especiales): del topic baja un riel que se reparte a cada columna de thread, y hacia la decisión un riel que nace **solo de las ramas que la alimentaron** y llega unido hasta su ícono (la línea misma cuenta la proveniencia). El riel se extiende más allá de la última columna únicamente cuando existen más threads; en pantallas chicas, el riel cortado por el borde indica que hay más para scrollear, sin rediseño responsive adicional.
- **Proveniencia también por referencia textual.** Además del riel: un subthread fuente lleva la marca "◆ citado en la Decisión del [fecha]" como link, y la card de decisión lista sus fuentes como links. Referencia bidireccional. Cualquier combinación de 1..N fuentes.
- **Patrones GitHub reutilizados:** resumen agrupado de actividad ("capturaste N entries en M threads" con links y barras proporcionales), anatomía de card tipo PR (título link, descripción, stats con convención +verde/−rojo adaptada), y **empty states con ilustración** dentro del feed que comunican el estado y ofrecen la siguiente acción.
- **Toda card abre su contenido al clic.** El contenido de un thread, subthread o decisión es el timeline vertical estilo GitHub (`river-wireframe-timeline.html`): agrupado por fecha, con íconos por tipo de evento (entry ✎ verde, snoozed ☾, shipped ★, convergence con el ícono morado de merge). El board es el mapa; el timeline es la lectura/escritura.
- **Dark mode exclusivo.** Toda la UI se diseña sobre fondo oscuro, con una sola paleta. Los wireframes están en claro solo por legibilidad como documento; la traducción a código va directo a oscuro. Sin toggle ni light mode en la v1.
- **Captura de dos tiempos (de la propuesta Bitácora).** Capturar nunca exige decidir destino: sin contexto cae al inbox y se procesa después (mover a topic/thread o crear uno nuevo); con topic abierto entra directo al topic, con la opción de desviarla al inbox quitando el chip.

---

## 9. Cómo trabajar con Claude Code (para no-programadores)

- Instalación y primeros pasos: https://docs.claude.com/en/docs/claude-code/overview
- Prompt inicial sugerido: *"Leé river-plan.md completo. Generá el CLAUDE.md a partir de la sección 3. Después arrancá la Fase 0 y explicame cada paso en lenguaje simple antes de ejecutarlo."*
- Pedir siempre: *"explicame qué hiciste y por qué, como si no supiera programar"*. Ese hábito convierte el proyecto en clase de programación.
- **Git en vivo:** pedirle a Claude Code que haga un commit al final de cada fase y que muestre el log. Construir River es, a la vez, el curso práctico de git: cada commit es una entry, cada rama un thread, el log es el main. La app y la herramienta se explican mutuamente.
- Si algo se rompe, no borrar nada: pedirle a Claude Code que vuelva al último commit que funcionaba. (Esa es la magia del historial que nunca se pierde, la misma filosofía de River.)

---

## 10. Acceso móvil (decidido el 19 jul 2026)

**Dos instancias, un solo código.** El mismo repo alimenta dos Rivers con datos separados:

- **Personal (celular + Mac):** deployada en **Vercel** con los datos en **Turso** (SQLite en la nube, plan gratuito). Vercel se conecta a GitHub: cada `git push` actualiza la instancia sola — no hay doble mantenimiento de código, solo dos bases de datos.
- **Trabajo (solo local):** este repo corriendo en la Mac con `npm run dev` y el archivo `river.db`. Nada del trabajo sale de la máquina.

**Cómo elige modo la app:** por variables de entorno. Sin nada seteado usa el archivo local; con `TURSO_DATABASE_URL` (+ `TURSO_AUTH_TOKEN`) usa Turso. Un solo código, cero ifs esparcidos: la decisión vive en `db/index.ts`.

**Protección:** la instancia personal está en internet, así que tiene una pantalla de login con **una sola contraseña** (`RIVER_PASSWORD`). Se entra una vez por dispositivo y queda recordado un año. Sin esa variable no hay login: la instancia local de trabajo ni se entera. Sigue siendo single-user: la contraseña es un portón, no un sistema de cuentas.

**En el celular:** desde el navegador, "Agregar a pantalla de inicio" — River se abre como app propia (ícono 1R, pantalla completa). La guía paso a paso del deploy está en `DEPLOY.md`.

**Backup de la instancia personal:** los datos viven en Turso; backup = `turso db shell river ".dump" > backup.sql` (la local sigue siendo copiar `river.db`).
