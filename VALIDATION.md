# Validación de la release 3.0.0

Comprobaciones realizadas el 12 de octubre de 2026 en Windows 11 x64.

- **28 pruebas automáticas correctas**: guardados JSON/Base64, inventario, reliquias, objetos transformados, NG+, alternativas AND/OR, misiones y compras, comunicación de raíces y abismos, cuadrantes y validación de señales de posición.
- Compilación del ejecutable con .NET Framework y de la interfaz autónoma. Arranque del ejecutable empaquetado sin Node ni un intérprete externo de Python.
- Servidor HTTP escuchando exclusivamente en `127.0.0.1`. Verificadas respuesta de la interfaz, protocolo local, estado «esperando al juego», actualización de fecha de la señal, rechazo de host ajeno, origen ajeno, acceso sin cabecera local y rutas fuera de la interfaz.
- Navegador: carga de un guardado real local, conexión automática de posición, desconexión/reconexión, ejemplo ficticio que no conecta al juego, filtros, mapa y capas. Con el juego cerrado no aparece un cursor de posición en directo.
- Interfaz comprobada a 1280 px y 390 px sin desbordamiento horizontal. Sin errores JavaScript durante el recorrido de carga y conexión.
- Importador **empaquetado como EXE** probado leyendo una instalación local de Steam: 36 gráficos de casillas y 24 iconos. La interfaz cargó los PNG importados y mantuvo la geometría y marcadores. El importador no incluye ni procesa audio/FMOD.
- Paquete público revisado para excluir guardados, gráficos originales, configuración del alojamiento anterior y rutas personales. Los gráficos importados durante la prueba se retiraron antes de crear el ZIP final.

El lector de memoria reutiliza el código cuya posición de casilla se había contrastado con el movimiento real del personaje en Steam. En la prueba del nuevo lanzador el juego estaba cerrado; se verificó el estado de espera y la integración automática. No se han comprobado todas las versiones del juego, tiendas, mods u ordenadores. Los límites y estados inciertos permanecen explícitos en la interfaz y README.

La release se construye con los mismos scripts en GitHub Actions, además de la validación local del paquete. El SHA-256 publicado corresponde a los archivos de esa compilación y permite comprobar la integridad de la descarga.
