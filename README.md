# Diario de Cvstodia · Blasphemous 1

Herramienta no oficial en español para analizar guardados locales, seguir coleccionables y explorar los accesos especiales de Cvstodia. Incluye mapa interactivo, filtros personalizables y lector de posición para Windows.

## Descargar y usar

1. Descarga **Diario-de-Cvstodia-3.0.0-windows-x64.zip** desde [Releases](https://github.com/NicolasGuerbartchoukPerez/blasphemous-companion/releases/latest). Los archivos «Source code» son para desarrollo.
2. Descomprime todo el ZIP en una carpeta donde puedas escribir y abre **DiarioDeCvstodia.exe**. Se abre la interfaz en tu navegador, en una dirección `http://127.0.0.1:8765/` (o un puerto próximo si está ocupado).
3. Pulsa **Cargar partida** y elige tu propio `savegame_0.save`, `savegame_1.save` o `savegame_2.save`. También puedes arrastrarlo sobre la interfaz.
4. Abre Blasphemous: al cargar una partida real, el lector integrado conecta automáticamente la posición. No necesitas instalar un mod, seleccionar una carpeta `live`, ni instalar Node o Python.
5. Para que el inventario también se actualice, usa **Conectar carpeta en vivo** en Chrome o Edge. Selecciona la carpeta que contiene esos archivos. La lectura se comprueba cada 3 segundos y refleja lo que el juego ha guardado; guarda en un altar para registrar cambios.

Guardados habituales en Windows:

```text
%USERPROFILE%\AppData\LocalLow\TheGameKitchen\Blasphemous\Savegames\
```

Dentro suele haber una subcarpeta numérica. Elige la de tu cuenta. No confundir la carpeta de instalación del juego con la de guardados.

La aplicación permanece abierta junto al reloj de Windows aunque cierres la pestaña. Para abrirla de nuevo, usa su icono o ejecuta el mismo archivo; para cerrarla, botón derecho sobre el icono → **Salir**. Tras reiniciar el ordenador debes volver a abrir el ejecutable. No hay servicio en la nube ni inicio automático.

## Mapa original opcional

El paquete incluye la geometría de las salas con gráficos propios. Para usar los gráficos originales de **tu instalación**:

1. Ejecuta **Importar-graficos.exe** desde la carpeta descomprimida.
2. Detectará instalaciones habituales de Steam. Si no la encuentra, pega la carpeta que contiene `Blasphemous.exe` (también sirve una instalación compatible de GOG/Epic).
3. Al terminar, recarga la pestaña. Los gráficos quedan en `assets-local/game-art.json`, junto al ejecutable. Activa **Fondo del mapa** en la configuración si quieres mostrar también el fondo.

El importador solo lee la instalación. Los gráficos se conservan localmente y no se incluyen en las releases ni en Git. No subas `assets-local` al repositorio. Requiere el formato Unity/Mono del juego de PC compatible con `data.unity3d`.

## Qué muestra

- 230 entradas del catálogo: 7 reliquias, 44 huesos, 38 querubines, cuentas, rezos, corazones, objetos de misión y mejoras.
- Estado de posesión separado del acceso: **accesible**, **requisitos pendientes** o **por verificar**. Los objetos consumidos no se consideran ausentes sin evidencia suficiente.
- Requisitos por camino: **Tres Lenguas Nudosas** para raíces, **Lienzo de Hilo de Oro** para ciertas caídas, plataformas de sangre, miasma y otros accesos. Una entrada concreta puede exigir una reliquia mientras otra no la exige.
- Selección de cuadrantes y resaltado de pasos especiales, con opción de priorizar casillas sin descubrir. Seguimiento por objeto, capas, tamaños, opacidad y filtros de spoilers.
- Posición de casilla actual cada 250 ms mientras el navegador está activo. El altar del guardado lleva un cursor tenue distinto. Una señal antigua o incompatible no se presenta como posición actual.

## Compatibilidad y límites

Release para **Windows 10/11 de 64 bits**, Blasphemous 1 de PC con runtime Unity/Mono, y .NET Framework 4.x (habitual en esas versiones de Windows). Chrome o Edge son recomendables para el seguimiento de carpeta. La carga manual y la posición integrada no dependen de ese permiso de carpeta.

El lector se ha validado con una instalación de Steam; no está comprobado en todas las revisiones, tiendas ni mods. Si el formato de memoria cambia, muestra posición no disponible en vez de inventar una casilla. Las salas de desafíos de Miriam no forman parte del mapa principal y no tendrán cursor sobre Cvstodia. No funciona con Blasphemous 2, consolas ni ejecutables IL2CPP.

La accesibilidad es una estimación conservadora para el recorrido normal, sin glitches. Algunas misiones, rutas alternativas y posiciones de objetos necesitan comprobación manual; la interfaz identifica las incertidumbres. Inventario y requisitos siguen usando el último guardado leído, aunque la posición esté en directo.

Los filtros y seguimientos se guardan en el almacenamiento del navegador; cambiar de navegador o puerto puede requerir configurarlos de nuevo. El ejecutable no está firmado digitalmente; Windows puede mostrar un aviso de editor desconocido. No requiere desactivar el antivirus ni ejecutarlo como administrador.

## Lectura local

La interfaz está incrustada en el ejecutable. No envía guardados ni posición a ningún servidor, no modifica el juego, no inyecta DLL y no escribe memoria. El servidor escucha exclusivamente en `127.0.0.1`, comprueba el host y exige peticiones del mismo origen para leer la posición. Los enlaces a wikis se abren solo cuando los pulsas. El lector no depende de protecciones de OpenAI: funciona por estas medidas locales.

## Desarrollo

Node 18+ para la web. No requiere `npm install`:

```powershell
npm test
npm run build
npm start
```

El servidor de desarrollo solo sirve la web; el lector integrado está en la release de Windows. Para construir la release, necesitas Windows, Node, Python 3.12+ y el compilador de .NET Framework:

```powershell
python -m venv .build-env
.build-env\Scripts\python.exe -m pip install -r scripts/requirements-build.txt
.\scripts\build-release.ps1 -Python .build-env\Scripts\python.exe
```

El resultado se genera en `release/`, con ZIP y `SHA256SUMS.txt`. El importador incorpora su runtime de Python. No se incluyen guardados ni gráficos importados en el paquete. [Validación](VALIDATION.md) describe las comprobaciones realizadas.

## Licencias y fuentes

Código del proyecto: GPL-3.0-or-later; consulta [LICENSE](LICENSE). Datos y reglas derivados de Blasphemous.Randomizer de BrandenEK se atribuyen bajo MIT en [THIRD_PARTY_LICENSE.txt](THIRD_PARTY_LICENSE.txt). El lector usa información de estructuras Mono documentada por just-ero/asl-help (GPL-3.0). Las dependencias del importador conservan sus licencias incluidas en el ZIP.

[SOURCE_RESEARCH.md](SOURCE_RESEARCH.md) documenta fuentes, contraste con el juego normal y correcciones. Blasphemous y sus gráficos pertenecen a sus titulares; este proyecto no está afiliado a The Game Kitchen ni Team17.
