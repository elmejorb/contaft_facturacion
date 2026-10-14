# Spike SQLite — Descubrimiento

Objetivo del spike (1-2h): medir qué tan grande es el esfuerzo real de la Fase 1 del plan de expansión de mercado antes de prometer tiempos.

## Pasos

1. `01_convertir_schema.php` — toma `conta_template_limpio.sql` (MySQL) y produce `conta_sqlite_candidate.sql` haciendo reemplazos conocidos. Reporta qué tablas se transformaron limpias y cuáles necesitan intervención manual.
2. `02_cargar_schema.php` — intenta crear la BD SQLite desde el archivo candidato. Captura cada error de `CREATE TABLE` y lo lista por tabla.
3. `03_tests_sobre_sqlite.php` — corre la suite actual (`conta-app-backend/tests/`) apuntando a SQLite en vez de MySQL. Mide: cuántos tests pasan, cuántos fallan, en qué query concreta.
4. `INFORME_SPIKE.md` — resumen al final: tablas limpias / tablas que necesitan trabajo / tests OK / queries que chillan / **estimación revisada**.

## Qué NO toca el spike

- Nada del backend productivo (`conta-app-backend/api/`).
- Nada de la rama `main`.
- Si falla todo, cerramos la rama y lo descartamos sin impacto.

## Decisiones que informa

- Si el schema migra limpio: podemos ir con el plan tal cual.
- Si hay dolores no previstos (triggers complejos, vistas con `WITH RECURSIVE` que SQLite no soporta igual, etc.): ajustamos la estimación o cambiamos de estrategia.
