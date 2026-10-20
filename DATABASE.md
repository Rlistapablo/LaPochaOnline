# PostgreSQL

`database/01_create_database.sql` crea rol y base de datos. Cambia la contraseña de ejemplo **antes** de ejecutarlo como administrador con `sudo -u postgres psql -f database/01_create_database.sql`. Si el rol o la base ya existen, no vuelvas a ejecutar ese script. La aplicación se conecta con `DATABASE_URL`.

`database/02_schema.sql` describe el esquema completo. `database/migrations/001_schema.sql` es la primera migración versionada; `002_advanced.sql` agrega eventos, instantáneas, repeticiones, perfiles de bots, ajustes, auditoría y orden de turnos; `003_operations.sql` agrega identificadores de operación para impedir duplicados. `npm run db:migrate` aplica solo migraciones pendientes, cada una en una transacción con bloqueo de asesoría; registra las versiones en `schema_migrations`. No edites migraciones ya aplicadas. El arranque también ejecuta las pendientes. `npm run db:seed` crea una cuenta de demostración solo en desarrollo; nunca se ejecuta automáticamente.

Las salas guardan el estado completo en `rooms.state`, incluidas manos y temporizadores lógicos. `game_events` guarda cada reparto, predicción, jugada, baza y resultado en orden; `game_snapshots` guarda estados periódicos; ambos contienen cartas privadas y solo deben ser accesibles al servicio y administradores de PostgreSQL. La API de repetición entrega esos datos únicamente cuando la partida ya terminó y el solicitante tiene acceso. `room_operations` evita repetir una acción recibida más de una vez. `room_players`, `room_settings` y `bot_profiles` describen la sala activa; `room_audit_log` conserva creación, cambios y cierre incluso después de borrar la mesa. `games` y sus tablas hijas guardan partidas finalizadas, rondas, orden de turnos, bazas, jugadas y penalizaciones. `matches` y `match_players` conservan compatibilidad con el historial y la clasificación existentes.

Copias de seguridad y restauración:

```bash
pg_dump -Fc -U pocha_user -h localhost pocha_db > pocha_db.dump
createdb -O pocha_user pocha_restored
pg_restore -U pocha_user -h localhost -d pocha_restored pocha_db.dump
```

Guarda el volcado fuera del repositorio. Para inspeccionar migraciones: `psql "$DATABASE_URL" -c 'TABLE schema_migrations;'`. La limpieza de salas inactivas elimina estados de más de 24 horas; las partidas terminadas permanecen en `games` y `matches`.
