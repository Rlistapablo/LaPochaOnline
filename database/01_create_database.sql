-- Ejecutar como administrador: sudo -u postgres psql -f database/01_create_database.sql
-- Sustituye esta contraseña antes de ejecutar el archivo.
CREATE ROLE pocha_user WITH LOGIN PASSWORD 'CAMBIAR_CONTRASENA_SEGURA';
CREATE DATABASE pocha_db WITH OWNER pocha_user ENCODING 'UTF8';
