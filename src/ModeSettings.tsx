import type {Modes} from '../shared/game';
import './modes.css';

type Props={modes:Modes;onChange:(next:Modes)=>void};

export function ModeSettings({modes:m,onChange}:Props){
  const set=(key:keyof Modes,value:Modes[keyof Modes])=>{
    const next={...m,[key]:value};
    if(key==='deck'&&value==='jokers')next.trump=false;
    if(key==='vision'&&(value==='blind'||value==='rivals')){next.exchangeEveryWaves=0;next.exchangeUses=0;next.revealPercent=0;}
    if(key==='vision'&&value==='neighbor')next.revealPercent=0;
    if((key==='exchangeEveryWaves'||key==='exchangeUses'||key==='revealPercent')&&Number(value)>0&&['blind','rivals'].includes(next.vision||''))next.vision='normal';
    if(key==='exchangeEveryWaves'&&Number(value)>0)next.exchangeUses=0;
    if(key==='exchangeUses'&&Number(value)>0){next.exchangeEveryWaves=0;next.exchangeRefreshRounds ||= 1;}
    if(key==='revealPercent'&&Number(value)>0&&next.vision==='neighbor')next.vision='normal';
    if(key==='lastStanding'&&value)next.infiniteLives=false;
    if(key==='infiniteLives'&&value)next.lastStanding=false;
    onChange(next);
  };
  const number=(key:keyof Modes,label:string,max=20,detail?:string)=><label className="modeNumber"><span><b>{label}</b>{detail&&<small>{detail}</small>}</span><input type="number" min={0} max={max} value={Number(m[key]||0)} onChange={event=>set(key,Math.max(0,Math.min(max,Number(event.target.value)||0)))}/></label>;
  const toggle=(key:keyof Modes,label:string,detail?:string,disabled=false)=><label className={'modeToggle '+(disabled?'disabled':'')}><input type="checkbox" checked={!!m[key]} disabled={disabled} onChange={event=>set(key,event.target.checked)}/><span><b>{label}</b>{detail&&<small>{detail}</small>}</span></label>;
  const activeCount=[!!(m.exchangeEveryWaves||m.exchangeUses),!!m.revealPercent,!!m.vision&&m.vision!=='normal',!!m.trump,!!m.noTimer,!!m.extraDecks,!!m.stealWinStreak,!!m.reshuffleWinStreak,!!m.recoverEvery,!!m.lastStanding,!!m.infiniteLives,!!m.deck&&m.deck!=='normal'].filter(Boolean).length;
  return <details className="modeSettings" onKeyDown={event=>{if(event.key==='Escape')event.currentTarget.open=false;}}>
    <summary><span className="modeSummaryTitle">Modos especiales <small>{activeCount?`${activeCount} ${activeCount===1?'regla activa':'reglas activas'}`:'Sin reglas adicionales'}</small></span><span className="modeOpenLabel">Configurar reglas ↗</span><span className="modeCloseLabel">Cerrar ×</span></summary>
    <div className="modeSections">
      <section><h3>Antes de predecir</h3><p>Decide qué información y cambios hay antes de elegir las bazas.</p>
        {number('exchangeEveryWaves','Ofrecer intercambio cada X ciclos',20,'0 = desactivado. El jugador elegido puede omitirlo y el rival puede rechazarlo.')}
        {number('exchangeUses','Cambios disponibles por jugador',10,'0 = desactivado. Cada jugador puede proponer un cambio por ronda; solo se gasta si se acepta.')}
        {!!m.exchangeUses&&<label className="modeNumber"><span><b>Renovar cambios cada X rondas</b><small>Los usos vuelven al máximo al empezar la ronda indicada; no se acumulan.</small></span><input type="number" min={1} max={20} value={m.exchangeRefreshRounds||1} onChange={event=>set('exchangeRefreshRounds',Math.max(1,Math.min(20,Number(event.target.value)||1)))}/></label>}
        {!!(m.exchangeEveryWaves||m.exchangeUses)&&<label className="modeNumber"><span><b>Cartas por intercambio</b><small>Cada participante elige las cartas que entrega.</small></span><input type="number" min={1} max={10} value={m.exchangeCount??1} onChange={event=>set('exchangeCount',Math.max(1,Math.min(10,Number(event.target.value)||1)))}/></label>}
        {number('revealPercent','Mostrar porcentaje de la mano',100,'0 = desactivado. Cada jugador elige qué cartas enseña.')}
        <label className="modeSelect">Cartas visibles al predecir<select value={m.vision||'normal'} onChange={event=>set('vision',event.target.value as Modes['vision'])}><option value="normal">Normal: ves tus cartas</option><option value="rivals">Ves rivales, no tu mano</option><option value="blind">Sin ver cartas</option><option value="neighbor">Solo ves al jugador contiguo</option></select></label>
      </section>
      <section><h3>Recompensas por racha</h3><p>Una ronda cuenta como ganada si aciertas exactamente la predicción. Un fallo reinicia la racha; nunca se entregan poderes al empezar.</p>
        {number('stealWinStreak','Robo cada X rondas ganadas seguidas',20,'Un uso por cada bloque de X aciertos. Cambias una carta tuya por una rival al azar.')}
        {number('reshuffleWinStreak','Redistribución cada X rondas ganadas seguidas',20,'Un uso por cada bloque de X aciertos. Mezclas y repartes las manos elegidas.')}
        <div className="modeHint">Pon 0 para desactivar cada recompensa. Los usos ganados se guardan para rondas posteriores.</div>
      </section>
      <section><h3>Baraja y bazas</h3><p>Elige la baraja y las reglas que afectan a cada baza.</p>
        <label className="modeSelect">Tipo de baraja<select value={m.deck||'normal'} onChange={event=>set('deck',event.target.value as Modes['deck'])}><option value="normal">Española normal</option><option value="jokers">Solo comodines</option><option value="figures">Solo figuras</option></select></label>
        {number('extraDecks','Barajas adicionales',5,'0 = una baraja; añade copias si hay muchos jugadores.')}
        {toggle('trump','Triunfo aleatorio','El palo ganador cambia cada ronda.',m.deck==='jokers')}
        {toggle('noTimer','Sin límite de tiempo','Las decisiones humanas no caducan.')}
      </section>
      <section><h3>Vidas y final</h3><p>Configura cómo se recuperan vidas y cuándo termina la partida.</p>
        {number('recoverEvery','Recuperar vida cada X aciertos seguidos',20,'Hasta el máximo inicial. 0 = desactivado.')}
        {toggle('lastStanding','Hasta que quede uno','Los eliminados dejan de jugar.',!!m.infiniteLives)}
        {toggle('infiniteLives','Vidas infinitas','No se descuentan vidas.',!!m.lastStanding)}
      </section>
    </div>
    <p className="modeCompatibility">Compatibilidad: los dos modos de intercambio son excluyentes. Jugar a ciegas o ver solo rivales desactiva intercambio y revelación. Ver solo al contiguo desactiva revelación. El triunfo requiere palos. Vidas infinitas y último superviviente no se combinan.</p>
  </details>;
}
