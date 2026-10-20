# La Pocha Online

Juego multijugador de La Pocha con 40 cartas españolas y entre 0 y 20 comodines configurables, predicciones, bots personalizables, salas públicas y privadas, cuentas e historial con repetición de partidas. React y Socket.IO presentan la partida; Node valida cada acción; PostgreSQL guarda salas, eventos, partidas y resultados.

## Inicio rápido (Ubuntu o Debian)

Requiere Node.js 20 o 22, npm 10 o posterior, PostgreSQL 14 o posterior y Git 2.30 o posterior. No necesita Docker.

```bash
sudo apt update
sudo apt install -y postgresql postgresql-client git curl
# Instala Node.js 22 LTS y npm desde nodejs.org o el repositorio oficial de tu distribución.
node --version && npm --version && psql --version && git --version
git clone http://192.168.1.120:3000/rlistapablo/pocha.git
cd pocha
nano database/01_create_database.sql # Cambia CAMBIAR_CONTRASENA_SEGURA
sudo -u postgres psql -f database/01_create_database.sql
cp .env.example .env
nano .env # Ajusta DATABASE_URL y JWT_SECRET; secreto aleatorio de al menos 32 caracteres
npm ci --include=dev
npm run db:migrate
npm run dev
```

Abre `http://localhost:5173`. En otro dispositivo de la red usa `http://IP_DEL_SERVIDOR:5173` y permite el puerto 5173 en el cortafuegos. En desarrollo, Vite envía `/api` y `/socket.io` a Node en el puerto 3001. PostgreSQL debe estar arrancado (`sudo systemctl status postgresql`).

## Producción

Configura `NODE_ENV=production`, `PUBLIC_APP_URL=http://IP_DEL_SERVIDOR:3001` y `CLIENT_ORIGIN` con la misma URL pública. Después:

```bash
npm ci --include=dev
npm run db:migrate
npm run build
npm run start
```

Node sirve `dist/`, API y Socket.IO en `http://IP_DEL_SERVIDOR:3001`. Para abrirlo en la red local permite TCP 3001 (`sudo ufw allow 3001/tcp` si UFW está activo). Ejecuta el servidor permanentemente con [pocha.service](pocha.service) y las instrucciones de [DEPLOYMENT.md](DEPLOYMENT.md).

Para compartir el puerto 80 mediante Nginx y publicar la app en `/pocha/`, compila con `npm run build:pocha` y sigue la sección de Nginx en [DEPLOYMENT.md](DEPLOYMENT.md).

## Comprobación

```bash
npm test
npm run simulate
npm run smoke # requiere servidor y PostgreSQL activos en localhost:3001
npm run smoke:rooms # concurrencia, salas privadas y expulsión
npm run smoke:restart # recupera una partida tras reiniciar Node
npm run smoke:production # frontend compilado y API en un solo proceso
npm run smoke:pacing # ritmo de los bots, revelado e historial de cartas
npm run smoke:auto-restart # eliminación, guardado y reinicio automático
npm run smoke:manual-finish # cierre del anfitrión, guardado y revancha
npm run smoke:advanced # permisos de mesas, bots, comodines, idempotencia y repetición
```

`simulate` ejecuta 10.000 partidas y comprueba la integridad de la baraja. `smoke` crea usuarios de prueba y juega una partida con dos WebSockets. Las cuentas de prueba persisten hasta borrarlas manualmente. `npm run db:seed` crea una cuenta de desarrollo e imprime una contraseña temporal; nunca se ejecuta automáticamente ni en producción.

La mesa muestra el orden de predicción y jugada, las bazas y vidas de cada jugador, un panel lateral con historial y una interfaz táctil con confirmación de carta. Las rondas siguen `X → … → 1 → … → X → X−1 → …` hasta que queda un jugador con vidas o todos pierden la última vida a la vez. Los jugadores eliminados observan sin recibir cartas ocultas. Las partidas terminadas se consultan en **Repeticiones**; las partidas privadas solo son visibles para sus participantes.

El anfitrión puede editar nombre, avatar y dificultad de los bots antes de empezar, y cerrar una mesa pública con **Eliminar mesa**. Para habilitar el panel **Moderación**, configura `ADMIN_USER_IDS` con los UUID de los administradores separados por comas. El servidor verifica estos permisos.

## Documentación

- [INSTALL.md](INSTALL.md): instalación nativa paso a paso.
- [DATABASE.md](DATABASE.md): esquema, migraciones y mantenimiento.
- [DEPLOYMENT.md](DEPLOYMENT.md): servicio systemd, actualización y red.
- [GAME_RULES.md](GAME_RULES.md): reglas y modos.

La instalación actual utiliza un único proceso Node. Para ejecutar varios procesos simultáneos hace falta coordinación distribuida de Socket.IO y del estado de salas.
