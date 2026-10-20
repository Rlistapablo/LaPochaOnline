# PostgreSQL

`database/01_create_database.sql` crea rol y base de datos. Cambia la contraseña de ejemplo **antes** de ejecutarlo como administrador con `sudo -u postgres psql -f database/01_create_database.sql`. Si el rol o la base ya existen, no vuelvas a ejecutar ese script. La aplicación se conecta con `DATABASE_URL`.

`database/02_schema.sql` describe el esquema completo. `database/migrations/001_schema.sql` es la primera migración versionada y contiene el mismo esquema. `npm run db:migrate` aplica solo migraciones pendientes, cada una en una transacción con bloqueo de asesoría; registra las versiones en `schema_migrations`. Crea nuevas migraciones numeradas sin cambiar las ya aplicadas. El arranque también ejecuta migraciones pendientes. `npm run db:seed` crea una cuenta de demostración solo en desarrollo; nunca se ejecuta automáticamente.

Las salas guardan el estado completo en `rooms.state`, incluidas manos y temporizadores lógicos. Este campo contiene información privada de la partida: limita el acceso a PostgreSQL al usuario del servicio y a administradores. `room_players` permite consultar asientos. `games` y sus tablas hijas guardan partidas finalizadas, rondas, bazas, jugadas y penalizaciones. Las claves únicas impiden duplicar una partida por ciclo, una baza por índice, una carta por ronda o una penalización por jugador y ronda. `matches` y `match_players` conservan compatibilidad con el historial y la clasificación existentes.

Copias de seguridad y restauración:

```bash
pg_dump -Fc -U pocha_user -h localhost pocha_db > pocha_db.dump
createdb -O pocha_user pocha_restored
pg_restore -U pocha_user -h localhost -d pocha_restored pocha_db.dump
```

Guarda el volcado fuera del repositorio. Para inspeccionar migraciones: `psql "$DATABASE_URL" -c 'TABLE schema_migrations;'`. La limpieza de salas inactivas elimina estados de más de 24 horas; las partidas terminadas permanecen en `games` y `matches`.
