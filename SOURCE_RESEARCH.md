# Accesibilidad de Blasphemous 1 normal: investigación y correcciones

Investigación 2026-10-10. Fuentes comunitarias contrastadas con código MIT del randomizer y nombres de flags presentes en una partida normal, leída sin modificaciones. Las referencias a flags son evidencia de estructura; salvo indicación, no prueban por sí solas la semántica del evento. Este documento conserva las notas técnicas utilizadas para adaptar las reglas al recorrido normal.

## Qué significa accesible

Separar **obtenido**, **alcanzable con el inventario disponible**, **requiere equipar**, **requiere acción/puzzle/combate**, **bloqueado por requisito**, **no verificable**. Poseer una reliquia permite equiparla y no equivale a llevarla equipada; solo hay tres ranuras. No convertir una predicción de fuerza contra un jefe en victoria actual. Tampoco inferir misión completada a partir de sala visitada o ruta posible.

[Relics (Wiki.gg)](https://blasphemous.wiki.gg/wiki/Relics) confirma siete reliquias, tres equipadas a la vez, y que ninguna es necesaria para acabar el recorrido principal del juego base. Sirven para recorridos y coleccionables opcionales. La Mano Incorrupta solo avisa de secretos, no desbloquea físicamente paredes: [Incorrupt Hand](https://blasphemous.wiki.gg/wiki/Incorrupt_Hand_of_the_Fraternal_Master).

## Por qué no trasladar literalmente reglas del randomizer

[Fuente primaria del proyecto, GAMEPLAY.md](https://github.com/BrandenEK/Blasphemous.Randomizer/blob/main/docs/GAMEPLAY.md) documenta estas diferencias: acceso a contenido NG+ fuera de NG+; plataformas extra en Jondo; cáliz que no se vacía; puzzle de Biblioteca sin quitar corazón; puzzle del sudario automatizado; puerta de viaje Albero retirada. También elimina fallos temporales de Tirso, Gémino, Viridiana y Cleofás. Cambia la función del escapulario ante Esdras y basta poseer el corazón verdadero para la recompensa de Crisanta.

[README del proyecto](https://github.com/BrandenEK/Blasphemous.Randomizer) identifica Double Jump y Boots of Pleading como mods adicionales, ajenos al juego normal.

Código inspeccionado local: `work/randomizer-reference/Blasphemous.Randomizer/ItemRando/BlasphemousInventory.cs` y JSON MIT `locations_items.json`, `doors.json`. Los `canBeat*` calculan fuerza por estadísticas y puertas disponibles. Las variables `redentoRooms`, `miriamRooms`, `chaliceRooms`, `guiltRooms` cuentan salas/posibilidad, no pasos efectivamente completados.

## Ajustes mínimos de variables de navegación (recorrido normal sin glitches)

| Variable del mod | Adaptación normal |
|---|---|
| `blood` | Poseer RE01; indicar equipar Sangre Perpetuada en Arena. |
| `canWalkOnRoot`, `canClimbOnRoot` | Poseer RE10; indicar equipar Tres Lenguas Nudosas. Escalada pared normal existe desde inicio; no exigir item de mod. |
| `linen` | Poseer RE05; Lienzo de Hilo de Oro para abismos, no inmunidad a pinchos. |
| `canWaterJump` | Poseer RE03; no `doubleJump`. |
| `canSurvivePoison1/2/3` | RE07 en modo normal conservador; excepciones por aguantar daño/Tiento deben mostrarse como técnica opcional, nunca ruta segura por defecto. |
| `doubleJump`, `boots` | false. |
| `dash`, `wallClimb` | true en juego normal; son capacidades básicas. |
| `canAirStall`, `canDawnJump`, `canDiveLaser`, `canEnemyBounce`, `canEnemyUpslash`, skips | false por defecto. Pueden habilitarse solo con modo técnicas separado y explicado. |
| `canCrossGap1/2/3` | En lógica fácil todavía existe rueda como alternativa normal de salto: conservar cláusulas `wheel` si procede; no inventar salto adicional. |
| `opened*`, `rode*`, `broke*` | Las definiciones del mod suelen inferirse de puertas alcanzables. Preferir flags de acción o recorrido real; si no hay evidencia, distinguir acción pendiente. |

## Overrides concretos por ID del catálogo

| ID | Regla normal y evidencia |
|---|---|
| RE01 | Requiere QI58 (Llave del Hermano Mayor) o puerta ya abierta. QI58 se compra por 400. [Blood Perpetuated](https://blasphemous.wiki.gg/wiki/Blood_Perpetuated_in_Sand), [Key](https://blasphemous.wiki.gg/wiki/Key_to_the_Chamber_of_the_Eldest_Brother). |
| RE02 / RE04 / RE10 | Bendecir QI67 Mano Cortada / QI66 Paño de Lino / QI14 Huevo Eclosionado respectivamente en fuente Albero. [Señor de las Orillas](https://blasphemous.wiki.gg/wiki/Blessed_Lord_of_Salty_Shores). |
| RE03 | Peregrinación Redento real y RB20/RB21/RB22 equipadas juntas ante estatua final. No basta `redentoRooms>=5` inferido por rutas; `REDENTO_LOCATION_5`, `REDENTO_PATH5_UNLOCKED`, `REDENTO_STATUE_DISCOVERED`, `REDENTO_CAVE_ITEM_OWNED` orientan estado. [Redento](https://blasphemous.wiki.gg/wiki/Redento). |
| RE05 | Al menos 20 querubines rescatados realmente y hablar con Jocinero. PR05 exige 38. [Relics Fandom](https://blasphemous.fandom.com/wiki/Category:Relics), [Sleeping Canvases](https://gamerwalkthroughs.com/blasphemous/part-11-the-sleeping-canvases/). |
| QI13 | QI10/QI11/QI12 entregados a Altasgracias o disponibles para entregarlos; ALTASGRACIAS_ALTAR1/2/3_QI10/11/12, ALTASGRACIAS_EGG_BROKEN. |
| QI14 | QI13 disponible o ALTASGRACIAS_EGG_OFFERED; dejar huevo árbol y salir/reentrar. **No exigir Perpetva vencida**: su encuentro es único y perderlo no bloquea este huevo. [Egg of Deformity quest](https://blasphemous.wiki.gg/wiki/Egg_of_Deformity_quest). |
| RB06 | Nudo de Pelo solo tras obtener RE10 y volver al huevo vacío de Altasgracias; no basta tener tres ofrendas. [Knot of Hair](https://blasphemous.wiki.gg/wiki/Knot_of_Hair). |
| HE07 | El JSON MIT carece de regla local. **Añadir RB19 AND RB26** disponibles, equipar ambas grandes ceras y hacer Penitencia de Sangre ante cuadros; paso manual pendiente. [Molten Heart Fandom](https://blasphemous.fandom.com/wiki/Molten_Heart_of_Boiling_Blood), corroboración [Reddit](https://www.reddit.com/r/Blasphemous/comments/d34vy0/help_on_sleeping_canvases_puzzle/). |
| PR15 | Puzzle tres libros: fervor lleno, quitar todos los equipos, esperar diez segundos. Si HE201 está equipado y puzzle no abierto, bloqueado en esta vuelta porque es irreversible. Poseer huesos es pista, no confundir con requisito demostrado: algunas respuestas antiguas discrepan. [Anatomy Books Puzzle](https://blasphemous.wiki.gg/wiki/Anatomy_Books_Puzzle), [Apodictic Heart](https://blasphemous.wiki.gg/wiki/Apodictic_Heart_of_Mea_Culpa), corroboración [Three Books Reddit](https://www.reddit.com/r/Blasphemous/comments/1e4140b). |
| RB104 / RB105 | Donaciones acumuladas Albero 5000/50000. `ID_ALMS.tears` es acumulado; no usar dinero bolsillo como cumplimiento, solo como capacidad de donar déficit. |
| PR201 | Cinco desafíos Miriam **completados**, no cinco salas alcanzables. `MIRIAM_CHALLENGE_1..5`, luego volver Miriam; `MIRIAM__QUEST_COMPLETED` tiene doble guion bajo real. |
| QI75 / altar tras cáliz | QI75 vacío se recoge; abrir altar requiere QI77 completamente lleno o D01Z05S23_CHALICEPUZZLE. Matar tres enemigos en una ruta sin muerte/teletransporte; pasar por sus salas no lo completa. [Chalice](https://blasphemous.wiki.gg/wiki/Chalice_of_Inverted_Verses). |
| QI203 | Recoger escapulario antes de matar Esdras. Si Esdras muerto sin él: ruta final C bloqueada en esta vuelta. [Incomplete Scapular](https://blasphemous.fandom.com/wiki/Incomplete_Scapular). |
| QI204 | Tras evitar la lucha de Esdras mediante QI203, visitarlo en capilla. **No exigir canBeatBridgeBoss/BOSSDEAD** para esta ruta alternativa. [Key Grown](https://blasphemous.wiki.gg/wiki/Key_Grown_from_Twisted_Wood). |
| HE201 | Acceso real al Traidor y dos ojos QI201/QI202 obtenidos/entregados; puertas de Diosdado requieren puzzle ruido hecho y llave QI204. SERENO_DLC2QUEST_FINISHED, SERENO_DOOR_REVEALED disponibles. [Diosdado](https://blasphemous.wiki.gg/wiki/Diosdado), [Visage](https://blasphemous.wiki.gg/wiki/Visage_of_Abnegation). |
| QI301 | Crisanta derrotada **con HE201 equipado**, no simplemente poseerlo y haber vencido versión normal. CRISANTA_LIBERATED es evidencia real, después hablar capilla. [Holy Wound](https://blasphemous.wiki.gg/wiki/Holy_Wound_of_Abnegation). |
| QI106 / QI107..110 / PR101 / HE101 | Contenido amanecidas limitado a NG+. Campana QI106 al ascender, versos solo amanecidas vencidas realmente; no salas alcanzables. [True Torment](https://blasphemous.wiki.gg/wiki/True_Torment), [Jibrael](https://blasphemous.wiki.gg/wiki/Jibrael). |
| RB34/RB35/RB36/HE10 | Recompensas confesor: hace falta RB41 Peso de Verdadera Culpa, estatua destruida, completar arena. Usar CONFESSOR_n_ARENACOMPLETED; contador `guiltRooms` del mod no prueba arena completada. [Immaculate Bead](https://blasphemous.wiki.gg/wiki/Immaculate_Bead). |

### Misiones con ubicación alternativa / condición incierta

- **PR08 Zarabanda**: Viridiana la entrega tras su tercera ayuda, en cualquiera de cinco jefes, o al final si sigue viva. `room=D07Z01S01` solo cubre opción final. Flags VIRIDIANA_DEAD_BOSS01..05, VIRIDIANA_DEAD, VIRIDIANA_REWARD_COMPLETED. Si se conoce sitio muerto, mostrar marcador alternativo; si no, informar ubicación variable. [Viridiana](https://blasphemous.wiki.gg/wiki/Viridiana).
- **PR11 Tiento**: Cleofás puede recompensar en iglesia o en cadáver Patio. `marksOfRefuge>=3 && cord` solo cubre salvación. Flags CLEOFAS_JOINED_ORDER, CLEOFAS_QUEST_FINISHED, CLEOFAS_DEAD, SOCORRO_STATE_GONE/KILLED, CLEOFAS_READY_TO_SUICIDE. No declarar inaccesible permanentemente por no tener cordón: existe ruta cadáver. [Lady quest](https://blasphemous.wiki.gg/wiki/Lady_of_the_Perpetual_Agony_quest).
- **QI01** cordón: hablar Cleofás y luego Ludovico; PENITENT_MET_CLEOFAS evidencia. No inferir por sala posible. [Cord](https://blasphemous.wiki.gg/wiki/Cord_of_the_True_Burying).
- **QI66** paño Tirso: primera hierba; alternativa junto tumba primer paciente muerto. [Tirso Fandom](https://blasphemous.fandom.com/wiki/Tirso). TIRSO_FIRSTREWARD_DONE, TIRSO_KISSER1..5_DEAD existen.
- **QI56** nudo Tirso: fuentes discrepan sobre necesidad seis hierbas. Fandom Tirso y Healing Herbs dicen que no exige salvar todos/dar todas; Wiki.gg quest afirma todas. Mantener `TIRSO_LASTREWARD_DONE` como evidencia segura; estado pendiente de verificar tras seis jefes, sin bloquear por `herbs<6`. TIRSO_TIRSO_DEAD puede afectar NPC. [Healing Herbs](https://blasphemous.fandom.com/wiki/Healing_Herbs_(quest)), [contraste Wiki.gg](https://blasphemous.wiki.gg/wiki/Kissers_of_Wounds_quest).
- **Gémino QI59/QI57/QI68/RB10/PR04**: misión iniciada al entrar Where Olive Trees Wither; puede perder dedal si no habla antes de progreso jefes. Tumba alternativa por RE05 si árbol terminado. Flags GEMINO_FROZEN, GEMINO_TREE_ENDING, GEMINO_ENTRANCE_OPEN, GEMINO_TOMB_OPEN, GEMINO_FIRST_CONVERSATION_DONE, GEMINO_OFFERING_DONE, GEMINO_RB10_REWARD; PR04 Saeta necesita flores QI68 y acceso tumba, no asumir ruta temprana por `openedWOTWCave` del mod. [Golden Thimble quest](https://blasphemous.wiki.gg/wiki/Golden_Thimble_quest).

## Compras: añadir precio por ID

Dinero bolsillo real: `commonElements.ID_STATS.currentValues.Purge`; compras hechas: `<ID>_BOUGHT_AT_CANDELARIA` real. Acceso tienda más dinero >=precio => se puede comprar ahora; solo acceso no basta.

| Tienda | IDs y precios |
|---|---|
| Mercy Dreams D01BZ02S01 | QI58=400; RB05=1000; RB09=1500 |
| Graveyard D02BZ02S01 | QI11=800; RB37=1200; RB02=5000 |
| Sleeping Canvases D05BZ02S01 | RB12=4000; QI49=9000; QI71=9999 |

[Candelaria](https://blasphemous.wiki.gg/wiki/Candelaria). `tears` del randomizer corresponde a objetos tears recolectados en seed, no necesariamente cartera actual.

## Ceras: no usar Initial como lugar físico

RB17/24 son primera cera fija; RB18/19 y RB25/26 son **estado creciente**, no objeto fijo en una vela concreta. Hay dos velas adicionales por color y se recorren en cualquier orden. Una cera grande demuestra las menores obtenidas, no que cada vela en una posición fija sea el ID menor.

- Rojo: inicial D01Z04S08; mejoras D02Z03S06 y D05Z01S02. CANDLE_RED_1_USED (Convento), CANDLE_RED_2_USED (Biblioteca).
- Azul: inicial D02Z03S17; mejoras D17Z01S04 y D01Z04S16. CANDLE_BLUE_1_USED (Hermandad), CANDLE_BLUE_2_USED (Mercy).
- Segunda etapa: cera inicial y **una** vela pendiente alcanzable. Tercera: media actual y **otra** vela pendiente alcanzable. No exigir futuras velas ya usadas como faltantes.

[Red Wax](https://blasphemous.wiki.gg/wiki/Bead_of_Red_Wax), [Blue Wax](https://blasphemous.wiki.gg/wiki/Bead_of_Blue_Wax). Rooms y asociación flags de JSON MIT; semántica de USED indica uso de esa vela, no posesión de fase nominal.

## Mapping jefes normal: no derivar flags del room mod

El mod asigna algunas ubicaciones de jefe a salas que **no son escenas de jefe vanilla**. En guardado real se ven estos nombres:

```js
const bossFlags = {
 canBeatBrotherhoodBoss: 'D17Z01_BOSSDEAD',
 canBeatMercyBoss: 'D01Z06S01_BOSSDEAD',
 canBeatConventBoss: 'D02Z05S01_BOSSDEAD',
 canBeatGrievanceBoss: 'D03Z04S01_BOSSDEAD',
 canBeatBridgeBoss: 'D08Z01S01_BOSSDEAD',
 canBeatMothersBoss: 'D04Z04S01_BOSSDEAD',
 canBeatCanvasesBoss: 'D05Z01S13_BOSSDEAD',
 canBeatPrisonBoss: 'D09Z01S03_BOSSDEAD',
 canBeatRooftopsBoss: 'D06Z01S25_BOSSDEAD',
 canBeatOssuaryBoss: 'D01BZ08S01_BOSSDEAD',
 canBeatMourningBoss: 'D20Z02S08_BOSSDEAD',
 canBeatPerpetua: 'BROTHERS_PERPETUA_DEFEATED'
};
```

Bridge ruta alternativa QI203 debe añadirse para navegación. Esdras muerto impide rama misión. Perpetva encuentro fallado todavía permite tránsito sala tras evento; no bloquear camino eterno por flag derrota false. `canBeatLegionary` necesita victoria de encuentro concreto (hay tres legionarios) o etiqueta combate pendiente, no true global por stats. Amanecidas flags reales SANTOS_AMANECIDA_AXE_DEFEATED, SANTOS_AMANECIDA_FACCATA_DEFEATED (doble C en save), SANTOS_AMANECIDA_BOW_DEFEATED, SANTOS_AMANECIDA_LANCE_DEFEATED; no basta activarlas.

## Tramos de reliquia y alternativas contrastadas

Aljibe Profanado tiene rutas alternativas: RE03+RE07 por agua/gas, y RE05 para caer desde Tierra de Iglesias. Tramo de raíces/elevador usa RE10; caer shaft con RE05 puede evitar un tramo pero no convierte todo Aljibe en accesible. QI45 vial y PR16 Zambra pueden venir por RE03 **o** RE05, según ruta. No colorear zona entera de una reliquia por un solo paso. [Empty Bile Vessel](https://blasphemous.wiki.gg/wiki/Empty_Bile_Vessel), [Chalice](https://blasphemous.wiki.gg/wiki/Chalice_of_Inverted_Verses), corroboración [Reddit rutas Aljibe](https://www.reddit.com/r/Blasphemous/comments/1f36xmz).

Soleá PR10 requiere raíces en Jondo; Corazón HE01 chandelier requiere sangre; reliquia pulmones se consigue sin tener ya pulmones. Incorrupt Hand no es llave de paredes. Marcar puertas/pasos individuales, alternativas AND/OR, dirección de caída y posibilidad de retorno. Si las dos rutas tienen requisitos diferentes, no presentar una sola reliquia como obligatoria en todos los casos.

## Desconocidos que deben conservarse

## Comunicación de abismos y rutas alternativas — 12 de octubre de 2026

[Linen of Golden Thread](https://blasphemous.wiki.gg/wiki/Linen_of_Golden_Thread): recompensa de Jocinero tras rescatar al menos 20 querubines; permite caer por los abismos que conectan con salas inferiores. No se comunica como inmunidad general a cualquier caída. [Three Gnarled Tongues](https://blasphemous.wiki.gg/wiki/Three_Gnarled_Tongues): raíces como puentes y paredes escalables.

[Empty Bile Vessel](https://blasphemous.wiki.gg/wiki/Empty_Bile_Vessel) y [Zambra to the Resplendent Crown](https://blasphemous.wiki.gg/wiki/Zambra_to_the_Resplendent_Crown): la vasija de Aljibe (QI45) y Zambra (PR16) admiten Uña Arrancada del Barro o Lienzo cayendo desde Yermo. Sus requisitos locales se corrigen a `nail || linen`; la llegada a la sala se sigue comprobando por separado. La presentación también incorpora el Lienzo cuando el requisito es una entrada inferior conectada a una caída explícita en el modelo.

Las alternativas de mods o glitches se excluyen de las explicaciones del recorrido normal. Los nombres de zona sustituyen las referencias a puertas internas; los códigos se conservan únicamente como detalles técnicos opcionales. Las posiciones aproximadas y los estados desconocidos se mantienen identificados.

## Criterio de incertidumbre

Si faltan flags concretos o proceden de otra versión, no convertir ausencia en false. Misiones variables/cadáveres, compras sin stats, mapas antiguos con puerta sin evento, desafíos solo alcanzables, escenas de jefes no mapeadas o estado de equipación temporal ambiguo necesitan `no verificable` o `acción pendiente`. Explicar qué se sabe y el siguiente paso, manteniendo el inventario confirmado separado de la accesibilidad estimada.


## Posición actual — 12 de octubre de 2026

- Formato de estructuras Mono x64: [just-ero/asl-help](https://github.com/just-ero/asl-help), Mono V1 y variante con atributos personalizados. Licencia GPL-3.0; el lector independiente incluye código fuente y licencia.
- Comprobación directa, solo lectura, de la instalación del juego: `Core.Logic.Penitent`, `PlatformCharacterController.m_smartCollider`, `SmartRectCollider2D.ResolveCollisions` y su caché `m_prevPos` de `transform.position`; `NewMapManager.CurrentMap.Cells` aporta los rectángulos reales y las claves de casilla; `CurrentScene` valida la sala. Se resuelven nombres de campos en Mono, sin ejecutar código dentro del juego.
- Se descartó `LastPlayerCell` como fuente única porque puede corresponder a una sala anterior. La posición física debe caer dentro del rectángulo de una casilla de la sala activa. Cargas, muerte, ausencia de jugador o coordenadas sin correspondencia no producen un marcador.
- El marcador señala la casilla, no una coordenada exacta dentro del dibujo ni una ruta automática hasta ella. Las localizaciones de accesos especiales se deducen de puertas/casillas y se etiquetan aproximadas cuando no hay una correspondencia única.
