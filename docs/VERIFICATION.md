# Revisión de la entrega

Fecha de revisión local: 3 de octubre de 2026.

- Reglas del código y comprobación de tipos: correctas.
- 92 casos correctos: 23 de lecturas de red, 17 de wallet y 52 de calculadora y tablero.
- Preparación de la web para publicar: correcta.
- Portada con distribución nueva: título centrado, galería del emblema, herramientas a distintas alturas y franja de ideas.
- Emblema circular propio en la portada y en el icono. Se han eliminado las capas cuadradas anteriores.
- Syne en títulos, IBM Plex Sans en textos y Space Mono en etiquetas. Archivos de fuentes servidos desde la propia web.
- Home, Explore, Calculate, Protocol e Ideas revisadas en Chrome a 320, 768, 1024 y 1440 píxeles con la nueva identidad.
- Una sola cabecera principal visible por sección. Sin desplazamiento horizontal de la página en esas medidas.
- El texto visible no contiene demo, simulation, simulator, simulate, test, preview ni sus equivalentes solicitados en español.
- Calculadora comprobada con cambios de cantidad y plazo, lectura de la bóveda y rechazo de cantidades negativas.
- Cantidad y plazo conservados al cambiar de sección. El enlace de salto al contenido no cambia la herramienta abierta.
- Menú móvil: apertura, selección de sección y cierre al tocar la sección ya activa comprobados.
- El tablero inicial está vacío. Ideas: creación, apoyo local, archivo recuperable, restauración y conservación tras recargar comprobados.
- Exportación JSON comprobada mediante un archivo descargado con una idea añadida durante la revisión.
- Botón para copiar el contrato comprobado. Contratos y enlaces contrastados con las fuentes originales.
- Panel de wallet: apertura, cierre con Escape y aviso cuando no hay wallet instalada comprobados.

La sesión con una wallet real del visitante no se ha utilizado: los casos de conexión, cambio de cuenta/red, respuestas tardías y saldo exacto se verifican con un proveedor controlado. IMDFORGE no pide firmas ni mueve fondos.

La lectura real de Ethereum fue correcta. Las cifras se consultan en el momento de uso; los valores de una captura anterior no garantizan datos actuales. La ruta muestra indisponibilidad si falla la consulta.

Las capturas, comprobaciones posteriores del despliegue y copia ZIP se guardan en la carpeta local artifacts, fuera del repositorio y del código publicado.
