import jwt from 'jsonwebtoken';

export type Identity={id:string;guest:boolean;name:string;avatar:string};

export function issueToken(user:Identity,secret:string){
  const payload=user.guest
    ? {id:user.id,guest:true,name:user.name,avatar:user.avatar}
    : {id:user.id,guest:false};
  return jwt.sign(payload,secret,{expiresIn:'30d'});
}

export function readToken(raw:string|undefined,secret:string):Identity{
  if(!raw)throw Error('Sesión requerida');
  const user=jwt.verify(raw.replace(/^Bearer /,''),secret) as Partial<Identity>;
  if(typeof user.id!=='string'||typeof user.guest!=='boolean')throw Error('Sesión inválida');
  return {id:user.id,guest:user.guest,name:user.name||'',avatar:user.avatar||'🃏'};
}
