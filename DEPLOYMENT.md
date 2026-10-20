# Despliegue Linux con systemd

Después de [INSTALL.md](INSTALL.md), instala la app en `/opt/pocha`, crea un usuario de sistema `pocha` y dale acceso al directorio. Protege `.env` con `chmod 600 .env`. Ajusta en `.env` `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3001`, `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_APP_URL` y `CLIENT_ORIGIN`. `CLIENT_ORIGIN` debe ser el origen público (esquema y host); `PUBLIC_APP_URL` debe ser la URL completa de acceso a la app.

Si vas a usar el panel de moderación, configura `ADMIN_USER_IDS` con UUID de cuentas registradas, separados por comas. Los administradores pueden cerrar mesas públicas; el historial de partidas canceladas permanece en PostgreSQL.

```bash
cd /opt/pocha
npm ci
npm run db:migrate
npm run build
sudo cp pocha.service /etc/systemd/system/pocha.service
sudo systemctl daemon-reload
sudo systemctl enable pocha
sudo systemctl start pocha
sudo systemctl status pocha
sudo journalctl -u pocha -f
```

El ejemplo usa `/opt/pocha`, usuario `pocha` y `/usr/bin/npm`. Comprueba la ruta con `which npm` y adapta el servicio si Node está instalado en otra ubicación. Detén con `sudo systemctl stop pocha`; reinicia con `sudo systemctl restart pocha`.

Para actualizar:

```bash
cd /opt/pocha
sudo systemctl stop pocha
git pull --ff-only origin main
npm ci
npm run db:migrate
npm run build
sudo systemctl start pocha
sudo systemctl status pocha
```

Antes de actualizar una instalación con datos, crea un respaldo con `pg_dump -Fc`. Las migraciones nuevas son incrementales y no borran cuentas, salas ni historiales. Si la actualización falla, conserva el respaldo y revisa `schema_migrations` antes de reiniciar el servicio.

Si la app se sirve en `/pocha/`, usa `npm run build:pocha` en lugar de `npm run build` cada vez que instales o actualices.

El servicio escucha en TCP 3001. En una LAN abre `http://IP_DEL_SERVIDOR:3001` y permite el puerto en el firewall (`sudo ufw allow 3001/tcp` si UFW está activo). Si usas un proxy HTTPS, dirige `/`, `/api` y `/socket.io` al mismo puerto y habilita la actualización WebSocket. Ejecuta **una** instancia Node hasta incorporar coordinación distribuida. Los logs están en `journalctl`; nunca imprimas secretos ni subas `.env`.

## Nginx en `/pocha/` junto a otras aplicaciones

Configura `.env` con la dirección real de tu servidor. `CLIENT_ORIGIN` lleva solo esquema, host y puerto; `PUBLIC_APP_URL` incluye la ruta de la aplicación:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3001
CLIENT_ORIGIN=http://TU_HOST
PUBLIC_APP_URL=http://TU_HOST/pocha/
```

Compila los recursos con la ruta pública. Vite incorpora `/pocha/` en las URL de los archivos, API, Socket.IO y enlaces de invitación:

```bash
cd /opt/pocha
npm ci
npm run db:migrate
npm run build:pocha
sudo systemctl restart pocha
```

Inserta los tres `location` de [deployment/nginx-pocha.locations.conf](deployment/nginx-pocha.locations.conf) **dentro del bloque `server` existente que escucha en el puerto 80**. No crees otro `server` con el mismo nombre y puerto si ya tienes uno para tus otras apps. Nginx recibe `/pocha/api/...` y `/pocha/socket.io/...` y quita el prefijo al enviarlos a Node, que sigue escuchando en 3001. La ruta `/pocha` redirige a `/pocha/`.

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I http://TU_HOST/pocha/
curl -i http://TU_HOST/pocha/api/admin/status
```

La primera petición debe responder 200; la segunda debe llegar a la API y responder 400 por faltar la sesión. Abre `http://TU_HOST/pocha/` y comprueba que se pueden crear salas y que la conexión en tiempo real funciona. Mantén el puerto 3001 accesible solo desde el propio servidor. Si usas HTTPS, cambia ambas URL de `.env` a `https://` y coloca los mismos `location` en el bloque TLS.
