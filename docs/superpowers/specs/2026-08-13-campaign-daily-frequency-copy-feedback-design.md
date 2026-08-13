# Frecuencia diaria y confirmación de copia del mega prompt

## Objetivo

Eliminar la ambigüedad de la frecuencia del asistente de campañas y confirmar visualmente que el mega prompt se ha copiado.

## Frecuencia

- La unidad del asistente será siempre publicaciones por día.
- La interfaz mostrará `Publicaciones por día` y la etiqueta accesible indicará la misma unidad.
- El resumen del asistente mostrará cada frecuencia con el sufijo `/día`.
- El briefing usará `postsPerDay` como nombre canónico.
- Se aceptará temporalmente `postsPerWeek` al leer un briefing anterior para no romper datos ya serializados. Por decisión de producto, su cifra se reinterpretará directamente como frecuencia diaria, sin dividir ni redondear: un valor antiguo `2` significará `2 publicaciones por día`.
- Si un canal contiene ambos campos, `postsPerDay` tendrá prioridad.
- El mega prompt expresará la frecuencia como `<n> publicaciones por día`.

## Confirmación de copia

- El botón conservará el texto `Copiar mega prompt` en reposo.
- Tras una copia correcta cambiará a `Copiado` durante dos segundos.
- Durante ese periodo permanecerá desactivado para evitar clics repetidos.
- El aviso existente seguirá mostrándose.
- Si la escritura en el portapapeles falla, no se activará el estado de éxito y se conservará el tratamiento de error actual.

## Alcance técnico

- `CampaignAssistantWizard`: campo diario, resumen y serialización.
- `CampaignAssistantBrief` y `renderChannels`: contrato diario y compatibilidad de lectura.
- `CampaignGuideCard`: estado temporal del botón de copia.
- Pruebas del asistente y del componente de copia.

## Verificación

- Prueba del texto diario producido en el mega prompt.
- Prueba de compatibilidad: `postsPerWeek: 2` produce `2 publicaciones por día`, salvo que exista `postsPerDay`, que tiene prioridad.
- Prueba del cambio `Copiar mega prompt` → `Copiado` y restauración temporal.
- TypeScript, lint focalizado y pruebas de campañas.
