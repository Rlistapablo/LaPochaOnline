import 'dotenv/config';
import {migrate,pool} from '../server/db.js';
import {randomBytes,randomUUID} from 'node:crypto';
import bcrypt from 'bcryptjs';
if(process.env.NODE_ENV==='production')throw Error('Los datos de desarrollo no se cargan en producción');
try{await migrate();const email='demo@pocha.local',password=randomBytes(18).toString('base64url');const inserted=await pool.query('INSERT INTO users(id,email,password_hash,name,avatar) VALUES($1,$2,$3,$4,$5) ON CONFLICT(email) DO NOTHING RETURNING id',[randomUUID(),email,await bcrypt.hash(password,12),'Demo','🃏']);if(inserted.rowCount)console.log(`Cuenta de desarrollo creada: ${email}\nContraseña temporal: ${password}`);else console.log(`La cuenta de desarrollo ${email} ya existe; no se modificó.`);}finally{await pool.end();}
