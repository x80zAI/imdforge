# Fuentes y datos de IMDFORGE

IMDFORGE es un proyecto independiente. Su diseño está inspirado en IMDLAB y sus herramientas explican escenarios de IMD. No representa al equipo de IMD y no tiene token propio, mesa de staking propia ni sistema de gobierno en cadena.

## Fuentes públicas

- Referencia visual: https://www.imdlab.site/
- Configuración pública de la referencia: https://www.imdlab.site/config.js
- Página oficial de IMD: https://imd.fun/token/
- Interfaz de POOL4: https://pool4.imd.fun/
- Documentación de POOL4: https://pool4.imd.fun/docs
- Token IMD en Ethereum: https://etherscan.io/token/0xD34a99Bc0f67aE1bbd63C660e6d0b0dd03E263B7
- Bóveda sIMD en Ethereum: https://etherscan.io/address/0x9efa934d9fad4ae28c998a40195646b965a97247

La dirección del token y de la bóveda coinciden en la configuración de IMDLAB y en las páginas oficiales consultadas. El 3 de octubre de 2026 se comprobó mediante un servicio público de Ethereum que ambas direcciones tenían código, que la bóveda usaba IMD como activo y que IMD tenía 18 decimales. También se comprobó que la bóveda sIMD tenía 24 decimales: estos últimos no se usan para convertir su saldo total de IMD, que se expresa en las unidades del token IMD.

Esta comprobación identifica el origen de las lecturas. No es una auditoría del funcionamiento ni de la seguridad de los contratos. La documentación de POOL4 explica sus permisos de propietario, programas pendientes y riesgos.

## Qué consulta la web

La ruta `/api/network` solo admite peticiones GET. Lee Ethereum a través de `https://ethereum.publicnode.com`; si ese servicio falla, intenta `https://cloudflare-eth.com` dentro del mismo límite de diez segundos. No necesita claves API.

Cada actualización comprueba la red Ethereum —identificador 1— y obtiene un bloque. Después consulta, en ese mismo bloque:

1. El código del token IMD y de la bóveda sIMD.
2. El activo de la bóveda, que debe coincidir con IMD.
3. Los decimales de IMD, que deben ser 18.
4. `totalSupply()` del token IMD.
5. `totalAssets()` de la bóveda, expresado en IMD.

La oferta mostrada es la que devuelve el contrato IMD de Ethereum. No debe presentarse como una suma independiente y comprobada de todas las cadenas o como una cifra de circulación libre. El total de la bóveda representa su respaldo en IMD; no es la cantidad de participantes ni un saldo en dólares.

Las cantidades se convierten con números enteros grandes y se envían como texto decimal para conservar su precisión. La respuesta incluye el número de bloque y la fecha de lectura. Las respuestas correctas se guardan durante 45 segundos; la caché del servidor de distribución puede servir esa misma lectura durante otros 60 segundos mientras la renueva. La fecha visible permite conocer la antigüedad del dato.

Si una comprobación falla en ambos servicios, la ruta devuelve un estado de indisponibilidad. Nunca sustituye una lectura fallida por cantidades inventadas o ceros. Un cero solo es válido si el contrato comprobado devuelve realmente cero. La ruta no recibe direcciones de visitantes, no guarda wallets, no firma ni envía transacciones y no ofrece un proxy para métodos arbitrarios de Ethereum.

## Simulador y propuestas

La documentación de POOL4 describe un reparto del 4,5 % del IMD retirado hacia los participantes de la bóveda. Ese 4,5 % es una parte de cada reparto: no es una rentabilidad anual garantizada. La parte destruida se describe por separado como un 85 %. Los parámetros pueden cambiar según los permisos descritos por el protocolo.

La actividad diaria introducida en el simulador es un supuesto del visitante. No se presenta como una lectura diaria real ni como una predicción. La estimación asume actividad y reparto constantes, sin otros depósitos o retiradas; no considera precio, comisiones ni una rentabilidad garantizada. El simulador no realiza depósitos.

Las ideas y apoyos de la sección comunitaria se guardan en el navegador del visitante. No se comparten automáticamente con otros visitantes y no constituyen votos en cadena. Las ideas de ejemplo deben estar identificadas como ejemplos. Borrar los datos del navegador elimina esos registros locales; una copia exportada permite conservarlos.
