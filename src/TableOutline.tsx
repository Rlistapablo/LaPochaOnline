type Vertex={id:string;seatX:number;seatY:number;playX:number;playY:number};
export type TableLayout={vertices:Vertex[];arrows:string[]};

export function tableLayout(ids:string[]):TableLayout{
  const count=ids.length;
  const vertices=ids.map((id,index)=>{
    const angle=Math.PI/2-index*2*Math.PI/count;
    return {id,seatX:50+37*Math.cos(angle),seatY:50+37*Math.sin(angle),playX:50+22*Math.cos(angle),playY:50+22*Math.sin(angle)};
  });
  const arrows=count<2?[]:vertices.map((_,index)=>{
    const step=2*Math.PI/count;
    const from=Math.PI/2-(index+.24)*step;
    const to=Math.PI/2-(index+.72)*step;
    const point=(angle:number)=>`${50+43*Math.cos(angle)} ${50+43*Math.sin(angle)}`;
    return `M${point(from)} A43 43 0 0 0 ${point(to)}`;
  });
  return {vertices,arrows};
}

export function TableOutline({layout,startId,endId,markerId}:{layout:TableLayout;startId?:string;endId?:string;markerId:string}){
  const {vertices,arrows}=layout;
  return <svg className="tableOutline" viewBox="0 0 100 100" aria-hidden="true">
    <circle className="tableOuterRim" cx="50" cy="50" r="47"/>
    <circle className="tableRim" cx="50" cy="50" r="44.5"/>
    <circle className="tableRimHighlight" cx="50" cy="50" r="42"/>
    {arrows.map((arrow,index)=>vertices[index].id===endId&&vertices[(index+1)%vertices.length].id===startId?null:<path className="rotationArrow" key={index} d={arrow} markerEnd={`url(#${markerId})`}/>)}
    <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#ffe69a"/></marker></defs>
  </svg>;
}
