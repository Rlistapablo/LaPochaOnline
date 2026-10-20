import 'dotenv/config';
import {migrate,pool} from '../server/db.js';
if(process.env.NODE_ENV==='production')throw Error('Los datos de desarrollo no se cargan en producción');
try{await migrate();console.log('Esquema preparado. Crea usuarios de prueba desde la interfaz.');}finally{await pool.end();}
