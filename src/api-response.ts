export class ApiResponseError extends Error {
  constructor(message:string,public status:number){super(message);this.name='ApiResponseError';}
}

export async function readApiResponse<T=any>(response:Response):Promise<T>{
  const contentType=response.headers.get('content-type')||'';
  if(!contentType.toLowerCase().includes('application/json')){
    if(response.status===400&&/Request Header Or Cookie Too Large/i.test(await response.text())){
      throw new ApiResponseError('La sesión guardada supera el límite del servidor. Recarga la página e inicia sesión de nuevo.',400);
    }
    throw new ApiResponseError('El servidor ha respondido con una página en vez de datos. Comprueba la conexión y vuelve a intentarlo.',response.status);
  }
  let data:unknown;
  try{data=await response.json();}
  catch{throw new ApiResponseError('La respuesta del servidor no se ha podido leer. Vuelve a intentarlo.',response.status);}
  if(!response.ok){
    const message=data&&typeof data==='object'&&'error' in data&&typeof data.error==='string'?data.error:'Error del servidor';
    throw new ApiResponseError(message,response.status);
  }
  return data as T;
}
