type Vertex={id:string;x:number;y:number;seatX:number;seatY:number;playX:number;playY:number};
type Arrow={x1:number;y1:number;x2:number;y2:number};
export type TableLayout={vertices:Vertex[];outline:string;arrows:Arrow[]};

function roundedOutline(vertices:Vertex[]){
  if(vertices.length===2)return 'M44 8 Q50 5 56 8 C79 19 96 36 96 50 C96 64 79 81 56 92 Q50 95 44 92 C21 81 4 64 4 50 C4 36 21 19 44 8 Z';
  const round=.14;
  const toward=(from:Vertex,to:Vertex)=>`${from.x+(to.x-from.x)*round} ${from.y+(to.y-from.y)*round}`;
  return vertices.map((vertex,index)=>{
    const previous=vertices[(index+vertices.length-1)%vertices.length],next=vertices[(index+1)%vertices.length];
    return `${index?'L':'M'}${toward(vertex,previous)} Q${vertex.x} ${vertex.y} ${toward(vertex,next)}`;
  }).join(' ')+' Z';
}

export function tableLayout(ids:string[]):TableLayout{
  const count=ids.length;
  const vertices=ids.map((id,index)=>{
    const angle=Math.PI/2-index*2*Math.PI/count;
    const playRadiusX=count===2?0:28,playRadiusY=count===2?14:18;
    return {id,x:50+46*Math.cos(angle),y:50+44*Math.sin(angle),seatX:50+38*Math.cos(angle),seatY:50+35*Math.sin(angle),playX:50+playRadiusX*Math.cos(angle),playY:50+playRadiusY*Math.sin(angle)};
  });
  const arrows=vertices.map((vertex,index)=>{
    const next=vertices[(index+1)%count];
    const startX=50+(vertex.x-50)*.88,startY=50+(vertex.y-50)*.88;
    const endX=50+(next.x-50)*.88,endY=50+(next.y-50)*.88;
    return {x1:startX+(endX-startX)*.24,y1:startY+(endY-startY)*.24,x2:startX+(endX-startX)*.72,y2:startY+(endY-startY)*.72};
  });
  return {vertices,outline:roundedOutline(vertices),arrows};
}

export function TableOutline({layout,startId,endId,markerId}:{layout:TableLayout;startId?:string;endId?:string;markerId:string}){
  const {vertices,outline,arrows}=layout;
  const two=vertices.length===2;
  return <svg className="tableOutline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <path className="tableOuterRim" d={outline}/>
    <path className="tableRim" d={outline} transform="translate(50 50) scale(.95) translate(-50 -50)"/>
    <path className="tableRimHighlight" d={outline} transform="translate(50 50) scale(.925) translate(-50 -50)"/>
    {two?<>{vertices[0].id!==endId&&<path className="rotationArrow" d="M60 76 Q85 50 60 24" markerEnd={`url(#${markerId})`}/>}{vertices[1].id!==endId&&<path className="rotationArrow" d="M40 24 Q15 50 40 76" markerEnd={`url(#${markerId})`}/>}</>:arrows.map((arrow,index)=>vertices[index].id===endId&&vertices[(index+1)%vertices.length].id===startId?null:<line className="rotationArrow" key={index} {...arrow} markerEnd={`url(#${markerId})`}/>)}
    <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#ffe69a"/></marker></defs>
  </svg>;
}
