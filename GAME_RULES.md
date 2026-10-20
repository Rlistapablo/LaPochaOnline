# Reglas de La Pocha Online

- La baraja tiene 40 cartas españolas y entre 0 y 20 comodines configurables. Pueden participar de 2 a 8 jugadores humanos o bots, con 3 o 5 vidas iniciales.
- El primer jugador se elige al azar al empezar la partida. El orden de predicción y de juego rota en cada ronda y se muestra en la mesa.
- Las rondas van del máximo posible a una carta y vuelven a subir. La secuencia continúa en ciclos sin repetir el máximo en el cambio de ciclo mientras nadie agote sus vidas. El máximo depende de la baraja y del número de jugadores.
- Antes de predecir, cada jugador ve su mano. En la modalidad de una carta oculta, ve las cartas rivales y no la propia. El anfitrión puede elegir la modalidad visible o alternar entre partidas.
- Cada jugador predice cuántas bazas ganará. La última predicción no puede hacer que la suma de todas las predicciones iguale el número de cartas repartidas.
- Se puede jugar cualquier carta sin obligación de seguir palo. Gana el mayor valor; en empate, la última carta jugada de ese valor. Al jugar un comodín, se declara uno de los diez valores.
- Las jugadas de los bots se muestran una a una con una pausa aproximada de 1,2 segundos. Al terminar una baza, sus cartas permanecen visibles unos 3 segundos. El historial muestra las bazas de cada ronda en orden y las repeticiones de partidas terminadas permiten avanzar carta a carta.
- Al terminar la ronda, se pierden vidas según la diferencia absoluta entre predicción y bazas ganadas. En modo normal se pierde una vida por baza de diferencia. En modo progresivo, los fallos consecutivos multiplican esa diferencia por 1, 2, 3…; acertar reinicia la racha. Las vidas nunca bajan de cero.
- Si cualquier jugador llega a cero vidas al terminar una ronda, la partida termina siempre, aunque queden varios jugadores con vidas. Gana quien conserve más vidas; si varios empatan con el máximo, comparten la victoria. Tras el resultado final, comienza automáticamente una nueva partida en la misma sala pasados unos 8 segundos.
- El anfitrión puede usar **Terminar partida**. La ronda incompleta no se puntúa y el cierre manual no cuenta como victoria competitiva. También puede cerrar una sala pública; la partida en curso queda cancelada y su historial conservado.
- Los bots fácil, normal y difícil usan estrategias distintas. El difícil considera cartas visibles, cartas ya jugadas, orden de turno y probabilidad de acertar su predicción; no consulta manos ocultas de otros jugadores. El anfitrión puede cambiar su nombre, avatar y dificultad.
- Las salas públicas aparecen en **Buscar partida** mientras están disponibles. Las privadas requieren código o enlace. El anfitrión configura la sala, añade bots y puede expulsar jugadores antes de empezar.
