import 'dotenv/config';
import {migrate,pool} from '../server/db.js';
try{await migrate();console.log('Base de datos actualizada');}finally{await pool.end();}
