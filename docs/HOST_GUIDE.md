# Guida rapida host

Premi `?` durante un minigioco per aprire il pannello delle scorciatoie. Sono disponibili `R` (reveal), frecce per navigare e spazio per il timer. Alcuni giochi mantengono `C`, `X` e `P` per avanzare lo stato della domanda, senza assegnare punti.

I comandi `RESET DOMANDA`, `RESET GIOCO` e `Nuova partita` hanno ambiti distinti. Le operazioni distruttive generano prima un backup locale/esportato.

## Prima della partita

1. Avvia il server con `npm run dev`.
2. Apri `http://127.0.0.1:5173`.
3. Controlla giocatori, punteggi iniziali e media nell'Admin.
4. Esporta un backup JSON.
5. Prova fullscreen, audio e timer sul dispositivo di proiezione.

## Durante la partita

- Tutti i giocatori rispondono contemporaneamente: non esiste un turno o un giocatore attivo.
- Clicca la scheda di un giocatore e usa il pannello rapido per modificare esclusivamente il suo punteggio.
- Per ridimensionare le schede, torna alla Home, premi `MODIFICA` e usa la sezione **Pulsanti giocatori**: larghezza, altezza, font e spaziatura vengono salvati nel layout.
- Mostrare una risposta non aggiunge pulsanti di assegnazione automatica.
- La vista pubblico non occupa più spazio nella toolbar; `H` resta disponibile come scorciatoia opzionale.
- `F` alterna il fullscreen.
- `Spazio` avvia o mette in pausa il timer.
- Le frecce cambiano domanda nei giochi sequenziali.
- `Ctrl+Z` annulla l'ultima modifica fuori dai campi di testo.

## Recupero

- Un import fallito non sostituisce la partita corrente.
- Prima di un import valido viene salvato un backup locale.
- “Nuova partita” azzera sessione, storico e punteggi, ma non elimina i contenuti.
