# IMDFORGE

Una web independiente para explorar IMD, calcular posibles recompensas de staking y guardar ideas para su comunidad. La interfaz pública está en inglés; esta documentación está en español.

El diseño usa negro, cobre y marfil, con un emblema circular propio, las tipografías Syne, IBM Plex Sans y Space Mono, una portada centrada y herramientas distribuidas a distintas alturas. La experiencia está inspirada en [IMDLAB](https://www.imdlab.site/), pero se ha escrito código propio: no se ha copiado su código fuente. IMDFORGE no pertenece al equipo oficial de IMD.

## Qué incluye

- **Home:** presentación del proyecto y acceso a las herramientas.
- **Explore:** oferta del contrato IMD de Ethereum, IMD en la bóveda sIMD, bloque y fecha de lectura. También muestra las direcciones y fuentes originales.
- **Calculate:** estimación en unidades IMD a partir de los supuestos que introduce el visitante. No hace depósitos.
- **Protocol:** explicación del mecanismo y enlaces a la documentación oficial.
- **Ideas:** tablero personal con ideas, apoyo local, archivo, restauración y exportación.
- **Wallet:** conexión opcional para leer el saldo IMD en Ethereum. No pide firmas, aprobaciones de gasto ni transferencias.

## Ejecutar en el ordenador

Necesitas **Node.js 24** y npm. Abre una terminal dentro de la carpeta del proyecto e instala las versiones guardadas en `package-lock.json`:

```sh
npm ci
npm run dev
```

Abre [http://127.0.0.1:5184](http://127.0.0.1:5184). La web local también dispone de la ruta que consulta los datos públicos de Ethereum. No necesitas una clave API ni guardar secretos de wallet.

Para crear y revisar la versión preparada para publicar:

```sh
npm run build
npm run preview
```

La vista previa utiliza también el puerto **5184**. Detén el servidor de desarrollo antes de iniciar la vista previa para dejar ese puerto libre. Los archivos de la web compilada se generan en `dist`.

## Comprobaciones

Antes de entregar o publicar cambios, ejecuta:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`lint` revisa las reglas del código; `typecheck` comprueba los tipos; `test` ejecuta las pruebas de la calculadora, tablero, wallet y lecturas de Ethereum. `build` comprueba los tipos de nuevo y prepara la web. Completa estas comprobaciones con una revisión en navegador de escritorio y móvil.

## Datos y direcciones

La red utilizada es **Ethereum Mainnet**, identificador 1.

| Elemento | Dirección |
| --- | --- |
| IMD | `0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7` |
| Bóveda sIMD | `0x9efa934d9fad4ae28c998a40195646b965a97247` |

Las direcciones aparecen en las fuentes oficiales consultadas. Puedes ver el [token en Etherscan](https://etherscan.io/token/0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7), la [bóveda en Etherscan](https://etherscan.io/address/0x9efa934d9fad4ae28c998a40195646b965a97247) y la [documentación de POOL4](https://pool4.imd.fun/docs).

La ruta `/api/network` comprueba la red, el código de ambos contratos, el activo de la bóveda y los decimales de IMD. Después consulta la oferta y el total de IMD de la bóveda en un mismo bloque. Los datos correctos se guardan temporalmente para reducir las consultas. Si los servicios públicos fallan, muestra que los datos no están disponibles y no inventa cantidades.

La oferta corresponde al contrato de Ethereum: no se presenta como una suma comprobada de todas las cadenas. El total de la bóveda se expresa en IMD, no en dólares. El origen, la duración de la caché y las comprobaciones realizadas se detallan en [docs/SOURCES.md](docs/SOURCES.md).

## Cómo calcula la calculadora

Introduce tu depósito hipotético, el IMD que ya existe en la bóveda, el IMD retirado del mecanismo por día y un plazo de 1 a 365 días. La bóveda inicial se mide **antes** de añadir tu depósito.

```text
Tu participación = tu cantidad / (bóveda inicial + tu cantidad)

Reparto diario a la bóveda = IMD retirado por día × 4,5 %

Recompensa estimada = reparto diario × días × tu participación
```

El **4,5 %** es la parte del IMD retirado que la documentación de POOL4 asigna a la bóveda. No es una rentabilidad anual prometida. El total retirado incluye distintos destinos; no debe confundirse con el IMD destruido, que la documentación describe por separado.

La actividad diaria es un supuesto manual. La estimación mantiene constantes ese supuesto, el reparto y los participantes, sin otros depósitos o retiradas. No incluye precio, comisiones, cambios de parámetros ni los tiempos reales de liberación del `RewardDripper`: este mecanismo puede repartir el IMD a lo largo del tiempo y no se simula su calendario. El resultado no predice cuándo recibirías una cantidad concreta.

El cálculo conserva 18 decimales mediante números enteros grandes y recorta las cifras al mostrarlas. Si tu cantidad o la actividad diaria es cero, la recompensa es cero. No hay un token IMDFORGE ni un contrato de staking propio.

## Ideas guardadas en el navegador

El tablero permite añadir hasta **30 ideas en total, incluidas las archivadas**. Cada idea tiene un título, una explicación y una categoría. Puedes marcar tu apoyo, archivar una idea y restaurarla desde el archivo.

Las ideas y los apoyos se guardan solo en el navegador que estás usando. Otros visitantes no los ven y los apoyos no constituyen una votación global ni en cadena. El tablero empieza vacío y solo contiene las ideas que añade el visitante.

**Export** descarga una copia JSON con las ideas activas, las archivadas y tus apoyos. **Restore idea** recupera una idea archivada dentro del tablero; no importa un archivo JSON. Si borras los datos del navegador, pierdes el tablero local. Si el navegador no permite guardar, la web lo indica y mantiene los cambios durante esa página; exporta una copia antes de salir.

## Estructura del proyecto

```text
api/network.mjs         Lecturas públicas de Ethereum y caché
src/App.tsx             Navegación y composición de la web
src/components/         Secciones, ilustración y panel de wallet
src/hooks/              Estado de los datos públicos y de la wallet
src/lib/                Calculadora, tablero, wallet y direcciones
src/styles/             Estilos y adaptación a móvil
public/favicon.svg      Símbolo del proyecto
tests/                  Pruebas del comportamiento
docs/SOURCES.md         Fuentes verificadas y límites de los datos
vite.config.ts          Desarrollo, vista previa y pruebas
vercel.json             Configuración de publicación en Vercel
```

## Publicación

### Enlaces del proyecto

- Repositorio: [github.com/x80zAI/imdforge](https://github.com/x80zAI/imdforge)
- Web: [imdforge.vercel.app](https://imdforge.vercel.app/)

El repositorio conserva el código fuente. Vercel utiliza la rama `main` como origen de las publicaciones. Cada entrega debe revisarse también en la web pública.

Vercel utiliza `npm ci`, ejecuta `npm run build`, sirve `dist` y publica `api/network.mjs` como función del servidor. La configuración utiliza Node.js 24. Antes de confirmar una publicación, comprueba la web pública, la ruta `/api/network`, la navegación, la calculadora, el tablero y las vistas de escritorio y móvil.
