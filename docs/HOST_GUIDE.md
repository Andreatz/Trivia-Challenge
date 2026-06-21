# Guida rapida host

Premi `?` durante un minigioco per aprire il pannello delle scorciatoie. Sono disponibili `R` (reveal), `C` (corretta), `X` (errata), `P` (passo), frecce per navigare, spazio per il timer e `H` per la vista pubblico.

I comandi `RESET DOMANDA`, `RESET GIOCO` e `Nuova partita` hanno ambiti distinti. Le operazioni distruttive generano prima un backup locale/esportato.

## Prima della partita

1. Avvia il server con `npm run dev`.
2. Apri `http://127.0.0.1:5173`.
3. Controlla giocatori, punteggi iniziali e media nell'Admin.
4. Esporta un backup JSON.
5. Prova fullscreen, audio e timer sul dispositivo di proiezione.

## Durante la partita

- Seleziona il giocatore dalla scorebar prima di assegnare punti.
- Usa i pulsanti specifici del gioco per corretta, errata o nessun punto.
- `H` alterna vista host e pubblico.
- `F` alterna il fullscreen.
- `Spazio` avvia o mette in pausa il timer.
- Le frecce cambiano domanda nei giochi sequenziali.
- `Ctrl+Z` annulla l'ultima modifica fuori dai campi di testo.

## Recupero

- Un import fallito non sostituisce la partita corrente.
- Prima di un import valido viene salvato un backup locale.
- “Nuova partita” azzera sessione, storico e punteggi, ma non elimina i contenuti.
