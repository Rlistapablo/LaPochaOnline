import {useEffect,useState} from 'react';
import type {View} from '../shared/game';
import './bot-editor.css';

type Bot=View['players'][number];
const icons=['🤖','🃏','👑','🦊','🐯','🦉','♠️','♥️'];

export function BotEditor({bot,save}:{bot:Bot;save:(profile:{id:string;name:string;avatar:string;difficulty:string})=>void}){
  const [name,setName]=useState(bot.name),[avatar,setAvatar]=useState(bot.avatar),[difficulty,setDifficulty]=useState(bot.bot||'normal');
  useEffect(()=>{setName(bot.name);setAvatar(bot.avatar);setDifficulty(bot.bot||'normal');},[bot.id,bot.name,bot.avatar,bot.bot]);
  return <div className="botEditor"><label>Nombre<input aria-label={`Nombre de ${bot.name}`} maxLength={24} value={name} onChange={event=>setName(event.target.value)}/></label><label>Avatar<select aria-label={`Avatar de ${bot.name}`} value={icons.includes(avatar)?avatar:'🤖'} onChange={event=>setAvatar(event.target.value)}>{icons.map(icon=><option key={icon} value={icon}>{icon}</option>)}</select></label><label>Dificultad<select aria-label={`Dificultad de ${bot.name}`} value={difficulty} onChange={event=>setDifficulty(event.target.value as 'easy'|'normal'|'hard'|'expert')}><option value="easy">Fácil</option><option value="normal">Normal</option><option value="hard">Difícil</option><option value="expert">Experto</option></select></label><button className="secondary" disabled={!name.trim()} onClick={()=>save({id:bot.id,name:name.trim(),avatar,difficulty})}>Guardar bot</button></div>;
}
