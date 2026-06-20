# Trivia Challenge

Tool web per ricreare e gestire il gioco **Trivia Challenge** nato da PowerPoint.

Questa versione è stata riallineata alla struttura dei file PowerPoint originali: schermata home in stile proiezione, sfondo blu/oro, pulsanti grandi arrotondati, barra punteggi in basso, scorciatoie `PUNTI`, `LISTA ANIME` e `POTERI`, schermata punti dedicata e minigiochi con layout più simili alle slide. I comandi host non sono più in un pannello separato: sono integrati nella stessa plancia 16:9 come HUD da videogame. In modalità fullscreen viene mandata a schermo intero solo la plancia del gioco, quindi la barra superiore dell'app non è visibile.

## Cosa include

- **Modalità Show** in formato 16:9, pensata per TV o proiettore.
- **Fullscreen presentazione**: usa il pulsante `⛶` o il tasto `F` per mostrare solo la plancia di gioco, senza header dell'app.
- **Home stile PowerPoint** con pulsanti per i minigiochi.
- **HUD host integrato nella slide** con selezione giocatore, selezione minigioco, correzioni rapide, reset, log e link rapidi.
- **Scorebar fissa in basso** con giocatori/squadre selezionabili.
- **Grafica videogame dinamica** con glow neon, griglia futuristica, animazioni leggere, sweep luminosi e card effetto HUD.
- **Schermate speciali**: Punti, Lista Anime / argomenti, Poteri.
- **Admin panel** per creare, modificare, duplicare ed eliminare contenuti.
- **Punteggi manuali** con bonus, correzioni rapide e storico.
- **Import / export JSON** per backup e preparazione partite.
- **Supporto media**: immagini, video e audio tramite file locali o URL esterni.
- **Galleria immagini di riferimento** dalla cartella `public/reference-images/`.
- **Deploy statico su GitHub Pages** tramite workflow incluso.

## Minigiochi supportati

1. **Indovina il personaggio**: 4 indizi/immagini rivelabili in stile tile PowerPoint. Punteggi: 1000, 500, 250, 50.
   Nell'editor dei box puoi aggiungere/duplicare/eliminare slide e regolare adattamento, posizione X/Y e zoom del ritaglio per ogni immagine.
2. **Schiva la Bomba**: griglia da 20 elementi, 16 corretti e 4 bombe/intrusi. Ogni risposta corretta vale 50 punti.
3. **Chi l'ha detto**: audio da ascoltare e risposta rivelabile tramite immagine/video. 100 punti.
4. **Occhio al dettaglio**: dettaglio iniziale e immagine completa in risposta. 200 punti.
5. **Completa la Frase**: citazione parziale da completare perfettamente. 200 punti.
6. **Reazione a catena**: 20 domande sequenziali su un argomento. 50 punti ciascuna.
7. **Le Dieci Fatiche**: 10 domande miste. 100 punti ciascuna.
8. **Ghigliottina**: 5 parole collegate da una risposta comune. 200 punti.
9. **Passaparola**: 21 lettere dell'alfabeto italiano in disposizione circolare, con difficoltà e bonus finali.
10. **Jeopardy**: tabellone a categorie con valori diversi per difficoltà.
11. **Sarabanda**: 25 punti per titolo, 25 per artista, 50 punti a risposta completa.

## Come avviarlo in locale

Non servono dipendenze.

```bash
python3 -m http.server 5173
```

Poi apri:

```text
http://localhost:5173
```

## Schermo intero presentazione

Nella modalità **Show**, premi il pulsante `⛶` nella barra in alto della plancia oppure premi il tasto `F`.

Il fullscreen viene applicato a `#app` e mostra soltanto la modalità Show: in questo modo non compaiono `Trivia Challenge Studio`, `Show`, `Admin` e `Punteggi`.

Per uscire, premi `Esc` oppure di nuovo `⛶`.

## Dove mettere immagini, video e audio

Inserisci i file dentro:

```text
public/assets/
```

Poi nel JSON admin usa percorsi come:

```json
"public/assets/personaggio-1.jpg"
```

I media devono restare locali. URL esterni e percorsi fuori da `public/assets/` vengono rifiutati durante l'importazione.

Dopo aver aggiunto, rinominato o rimosso asset, rigenera il manifest usato dall'editor:

```bash
npm run assets:manifest
```

`npm run assets:check` segnala file mancanti, formati non supportati, file grandi, duplicati e asset non referenziati staticamente.

Per stimare una compressione PNG lossless senza modificare i file:

```bash
npm run assets:optimize
```

L'applicazione esplicita usa `npm run assets:optimize:apply`, conserva percorsi e pixel e sostituisce soltanto file realmente più piccoli.

## Controlli host

- `H`: alterna controlli host e vista pubblico.
- `F`: entra o esce dal fullscreen.
- `Spazio`: avvia o mette in pausa il timer visibile.
- `Freccia sinistra/destra`: cambia domanda nei giochi sequenziali.
- `Ctrl+Z`: annulla l'ultima modifica fuori dai campi di testo.

La vista pubblico nasconde azioni host, editor, media controls e interazioni sulla scorebar senza modificare lo stato della partita.

## Immagini di riferimento

Le immagini esportate dai PowerPoint sono in:

```text
public/reference-images/
```

L'app le usa come riferimento visivo dentro l'admin, senza confonderle con i media reali delle domande. I media delle domande restano in `public/assets/`.

## Workflow consigliato

1. Vai in **Show** per usare la versione da proiettare.
2. Attiva `⛶` per mandare a schermo intero solo la plancia del gioco.
3. Usa la home per aprire un minigioco, oppure le scorciatoie **PUNTI**, **LISTA ANIME** e **POTERI**.
4. Usa l'**HUD integrato nella slide** per selezionare giocatore/minigioco, correggere punti, resettare e aprire schermate rapide.
5. Rivela indizi, mostra risposte e assegna punti direttamente dalla schermata del gioco.
6. Vai in **Punteggi** per correzioni manuali più grandi.
7. Vai in **Admin** per creare/modificare i minigiochi e aggiornare lista anime, poteri e giocatori.
8. A fine preparazione usa **Esporta JSON** come backup della partita.

## Persistenza dei dati

I dati sono salvati nel `localStorage` del browser. Questo rende il tool immediato e senza backend, ma significa che:

- i dati restano sul browser/dispositivo usato;
- conviene esportare spesso il JSON;
- per condividere una partita con un altro computer basta importare il JSON esportato.

## Roadmap tecnica

La base attuale è una PWA statica con cache offline progressiva degli asset locali, schema dati versionato, timer e controlli media. I prossimi interventi sono descritti nella roadmap e privilegiano stabilità locale, test, ottimizzazione degli asset e qualità dell'editor.

Vedi anche [`docs/CONTENT_SCHEMA.md`](docs/CONTENT_SCHEMA.md) e [`docs/ROADMAP.md`](docs/ROADMAP.md).
