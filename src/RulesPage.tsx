import './rules.css';

export function RulesPage(){
  return <section className="shell rulesPage" aria-labelledby="rules-title">
    <div className="rulesIntro">
      <span className="eyebrow">CÓMO JUGAR</span>
      <h1 id="rules-title">Reglas de La Pocha</h1>
      <p>El objetivo es acertar cuántas bazas ganarás en cada ronda y conservar tus vidas. Una baza es el conjunto de cartas que juega cada participante, una por turno.</p>
    </div>

    <div className="rulesSteps">
      <article className="panel ruleStep"><span className="ruleNumber">01</span><h2>Recibe tus cartas</h2><p>Cada jugador recibe el mismo número de cartas. Las rondas bajan hasta una carta y después vuelven a subir: por ejemplo, <strong>5 → 4 → 3 → 2 → 1 → 2 → 3 → 4 → 5</strong>. Al terminar la secuencia comienza otro ciclo.</p></article>
      <article className="panel ruleStep"><span className="ruleNumber">02</span><h2>Haz tu predicción</h2><p>Antes de jugar, indica cuántas bazas crees que ganarás, desde cero hasta el número de cartas de tu mano. La última persona en predecir no puede elegir una cifra que haga que la suma de todas las predicciones sea igual al número de cartas repartidas por jugador.</p></article>
      <article className="panel ruleStep"><span className="ruleNumber">03</span><h2>Juega las bazas</h2><p>Por turnos, cada jugador pone una carta. Puedes jugar cualquiera: no tienes que seguir el palo de la primera. Gana la carta de mayor valor; si empatan, gana la que se jugó más tarde. Quien gana abre la siguiente baza.</p></article>
      <article className="panel ruleStep"><span className="ruleNumber">04</span><h2>Conserva tus vidas</h2><p>Al acabar la ronda, compara las bazas ganadas con tu predicción. Si acertaste exactamente, no pierdes vidas. En penalización normal pierdes una vida por cada baza de diferencia. En progresiva, los fallos consecutivos multiplican esa diferencia por 1, 2, 3… Un acierto reinicia la racha.</p></article>
    </div>

    <div className="rulesDetailGrid">
      <article className="panel rulesDetail"><span className="eyebrow">CARTAS Y PALOS</span><h2>¿Qué carta gana?</h2><p>De menor a mayor: <strong>2 · 4 · 5 · 6 · 7 · Sota · Caballo · Rey · 3 · As</strong>. Los palos tienen el mismo valor, salvo que la sala active el triunfo.</p><p>Al jugar un comodín eliges uno de esos diez valores. El comodín no tiene palo. Si hay triunfo, cualquier carta de ese palo supera a las cartas de los demás palos y a los comodines, aunque su valor sea menor. Entre triunfos, gana el valor más alto; los empates siguen favoreciendo a la última carta.</p></article>
      <article className="panel rulesDetail"><span className="eyebrow">EJEMPLO</span><h2>Así se cuentan las vidas</h2><p>Predices <strong>2 bazas</strong> y ganas <strong>1</strong>: la diferencia es 1. Pierdes 1 vida con penalización normal. Si es tu segundo fallo seguido en modo progresivo, pierdes 2 vidas: 1 de diferencia × 2 de racha.</p><p>Las vidas nunca bajan de cero. Por defecto, si alguien llega a cero al terminar la ronda, acaba la partida. Gana quien tenga más vidas; si hay empate en el máximo, comparten la victoria. Al terminar, se guarda la repetición y se elimina la sala.</p></article>
    </div>

    <div className="panel rulesModes"><span className="eyebrow">AL CREAR LA SALA</span><h2>Modos especiales</h2><p>El anfitrión puede combinar reglas compatibles. Los cambios de cartas y la revelación ocurren antes de predecir; los robos y las redistribuciones pueden usarse durante la predicción o el juego, cuando la acción está disponible.</p>
      <div className="rulesModeGrid">
        <div><h3>Información e intercambio</h3><p>En la ronda de una carta puedes ver u ocultar la tuya, o alternar entre ambas opciones. Otros modos permiten predecir sin ver cartas, viendo las manos rivales o solo la del jugador contiguo. Puedes activar un intercambio cada ciertos ciclos para un jugador elegido al azar, o dar a todos un número fijo de cambios que se renueva cada ciertas rondas. En este último modo, cada jugador con usos puede proponer un cambio por ronda antes de predecir; solo gasta un uso si el rival acepta. El jugador puede pasar y el invitado puede rechazar. Con la revelación, cada jugador escoge el porcentaje de cartas que mostrará.</p></div>
        <div><h3>Baraja y triunfo</h3><p>La sala puede usar la baraja española con comodines, solo figuras o solo comodines, y añadir más barajas. El triunfo cambia de palo cada ronda: los cuatro palos salen en orden aleatorio antes de volver a mezclarse. No se aplica a una baraja formada solo por comodines.</p></div>
        <div><h3>Robos y redistribuciones</h3><p>Un robo intercambia una carta propia que eliges por una carta aleatoria de un rival. Una redistribución mezcla las cartas que aún conservan al menos dos jugadores elegidos y las reparte de nuevo, manteniendo el número de cartas de cada uno. Solo se ganan al encadenar el número configurado de rondas con predicción exacta. Un fallo reinicia la racha; los usos ya ganados se conservan hasta gastarlos.</p></div>
        <div><h3>Vidas, ritmo y final</h3><p>Una racha de predicciones exactas puede recuperar vidas, sin superar las iniciales. «Hasta que quede uno» elimina a quien llegue a cero y continúa con los supervivientes. Con vidas infinitas no se descuentan vidas; la partida sigue hasta que se termine manualmente. «Sin límite de tiempo» quita el reloj de las decisiones.</p></div>
      </div>
      <p className="rulesCompatibility">Algunas combinaciones se desactivan al configurar la sala: ver solo rivales o jugar a ciegas no se combina con intercambio ni revelación; ver al contiguo no se combina con revelación; vidas infinitas no se combina con «hasta que quede uno».</p>
    </div>
  </section>;
}
