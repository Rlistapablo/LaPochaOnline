# Instalación nativa en Ubuntu o Debian

## 1. Software

Usa Node.js 20 o 22, npm 10+, PostgreSQL 14+ y Git 2.30+. Instala PostgreSQL, cliente y Git:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-client git curl
sudo systemctl enable --now postgresql
```

Instala Node.js 22 LTS según [nodejs.org](https://nodejs.org/en/download) y comprueba `node --version` y `npm --version`. La versión de Node incluida en algunas distribuciones puede ser demasiado antigua.

## 2. Código y base de datos

```bash
git clone http://192.168.1.120:3000/rlistapablo/pocha.git
cd pocha
nano database/01_create_database.sql
sudo -u postgres psql -f database/01_create_database.sql
cp .env.example .env
nano .env
```

Antes de ejecutar el SQL, sustituye `CAMBIAR_CONTRASENA_SEGURA` por una contraseña nueva. Pon exactamente esa contraseña en `DATABASE_URL`. Genera `JWT_SECRET` con `openssl rand -hex 32`; guárdalo solo en `.env`. Si la contraseña incluye caracteres reservados para URL, codifícalos en `DATABASE_URL`.

## 3. Dependencias y migraciones

```bash
npm ci --include=dev
npm run db:migrate
```

`npm run db:seed` crea una cuenta de desarrollo con contraseña temporal, mostrada una vez en la consola. No se ejecuta automáticamente y está bloqueado en producción. Las demás cuentas se crean desde el registro.

Las migraciones `002_advanced.sql` y `003_operations.sql` amplían el esquema existente sin eliminar cuentas ni partidas. En una instalación existente, haz una copia con `pg_dump` antes de actualizar, ejecuta `npm run db:migrate` y después `npm run build`. El migrador registra cada archivo aplicado en `schema_migrations` y no repite los ya aplicados. Para el panel de moderación, añade `ADMIN_USER_IDS=uuid1,uuid2` a `.env` con los identificadores de cuentas registradas.

## 4. Desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173`. Para usar otro dispositivo, abre `http://IP_DEL_SERVIDOR:5173` y permite TCP 5173/3001 en el cortafuegos. Ajusta `CLIENT_ORIGIN` a la URL desde la que se abre el navegador. Detén el proceso con Ctrl+C.

## 5. Producción

En `.env`, pon `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3001`, `PUBLIC_APP_URL=http://IP_DEL_SERVIDOR:3001` y `CLIENT_ORIGIN` con el mismo origen. Ejecuta:

```bash
npm run build
npm run start
```

Abre `http://IP_DEL_SERVIDOR:3001`. Node sirve el frontend compilado directamente. Para arranque permanente sigue [DEPLOYMENT.md](DEPLOYMENT.md).
