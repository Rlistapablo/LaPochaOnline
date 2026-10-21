import {expect,it} from 'vitest';
import {ApiResponseError,readApiResponse} from './api-response';

it('explica cuando la API devuelve HTML en lugar de JSON',async()=>{
  const response=new Response('<!doctype html>',{status:502,headers:{'content-type':'text/html'}});
  await expect(readApiResponse(response)).rejects.toMatchObject({name:'ApiResponseError',status:502,message:expect.stringContaining('página')});
});

it('identifica el rechazo de Nginx por un token demasiado grande',async()=>{
  const response=new Response('<h1>400 Request Header Or Cookie Too Large</h1>',{status:400,headers:{'content-type':'text/html'}});
  await expect(readApiResponse(response)).rejects.toMatchObject({status:400,message:expect.stringContaining('sesión guardada')});
});

it('conserva el error JSON del servidor para distinguir una sesión caducada',async()=>{
  const response=new Response(JSON.stringify({error:'Sesión requerida'}),{status:400,headers:{'content-type':'application/json'}});
  await expect(readApiResponse(response)).rejects.toEqual(new ApiResponseError('Sesión requerida',400));
});
