type Point={x:number;y:number};
type Vertex={id:string;seatX:number;seatY:number;playX:number;playY:number};
export type TableLayout={vertices:Vertex[];arrows:string[]};

const radius=45;
const straight=50;
const quarter=Math.PI*radius/2;
const half=Math.PI*radius;
const perimeter=2*Math.PI*radius+2*straight;

// The fixed outline is a vertical stadium: two semicircles joined by straight sides.
function pointAt(distance:number):Point{
  const d=((distance%perimeter)+perimeter)%perimeter;
  if(d<=quarter){const angle=Math.PI/2-d/radius;return {x:50+radius*Math.cos(angle),y:100+radius*Math.sin(angle)};}
  if(d<=quarter+straight)return {x:50+radius,y:100-(d-quarter)};
  if(d<=quarter+straight+half){const angle=-(d-quarter-straight)/radius;return {x:50+radius*Math.cos(angle),y:50+radius*Math.sin(angle)};}
  if(d<=quarter+2*straight+half)return {x:50-radius,y:50+d-quarter-straight-half};
  const angle=Math.PI-(d-quarter-2*straight-half)/radius;
  return {x:50+radius*Math.cos(angle),y:100+radius*Math.sin(angle)};
}

function inset(point:Point,factor:number):Point{
  return {x:50+(point.x-50)*factor,y:75+(point.y-75)*factor};
}

function outline(radius:number){
  const left=50-radius,right=50+radius,top=50-radius,bottom=100+radius;
  return `M50 ${top} A${radius} ${radius} 0 0 1 ${right} 50 L${right} 100 A${radius} ${radius} 0 0 1 50 ${bottom} A${radius} ${radius} 0 0 1 ${left} 100 L${left} 50 A${radius} ${radius} 0 0 1 50 ${top} Z`;
}

export function tableLayout(ids:string[]):TableLayout{
  const count=ids.length;
  const step=perimeter/count;
  const percent=(value:number)=>Math.round(value*10000)/10000;
  const vertices=ids.map((id,index)=>{
    const seat=inset(pointAt(index*step),.78),play=inset(pointAt(index*step),.47);
    return {id,seatX:percent(seat.x),seatY:percent(seat.y/150*100),playX:percent(play.x),playY:percent(play.y/150*100)};
  });
  const arrows=count<2?[]:vertices.map((_,index)=>Array.from({length:9},(_,part)=>{
    const point=inset(pointAt((index+.2+part*.065)*step),.91);
    return `${part?'L':'M'}${point.x} ${point.y}`;
  }).join(' '));
  return {vertices,arrows};
}

export function TableOutline({layout,startId,endId,markerId}:{layout:TableLayout;startId?:string;endId?:string;markerId:string}){
  const {vertices,arrows}=layout;
  return <svg className="tableOutline" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true">
    <path className="tableOuterRim" d={outline(47)}/>
    <path className="tableRim" d={outline(44.5)}/>
    <path className="tableRimHighlight" d={outline(42)}/>
    {arrows.map((arrow,index)=>vertices[index].id===endId&&vertices[(index+1)%vertices.length].id===startId?null:<path className="rotationArrow" key={index} d={arrow} markerEnd={`url(#${markerId})`}/>)}
    <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#ffe69a"/></marker></defs>
  </svg>;
}
