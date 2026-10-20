# Despliegue Linux con systemd

Después de [INSTALL.md](INSTALL.md), instala la app en `/opt/pocha`, crea un usuario de sistema `pocha` y dale acceso al directorio. Protege `.env` con `chmod 600 .env`. Ajusta en `.env` `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3001`, `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_APP_URL` y `CLIENT_ORIGIN`. `PUBLIC_APP_URL` y `CLIENT_ORIGIN` deben corresponder al origen que abre el navegador.

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

El servicio escucha en TCP 3001. En una LAN abre `http://IP_DEL_SERVIDOR:3001` y permite el puerto en el firewall (`sudo ufw allow 3001/tcp` si UFW está activo). Si usas un proxy HTTPS, dirige `/`, `/api` y `/socket.io` al mismo puerto y habilita la actualización WebSocket. Ejecuta **una** instancia Node hasta incorporar coordinación distribuida. Los logs están en `journalctl`; nunca imprimas secretos ni subas `.env`.
