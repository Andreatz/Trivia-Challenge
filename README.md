# Trivia Challenge

Tool web per ricreare e gestire il gioco **Trivia Challenge** nato da PowerPoint.

## Versione online

- Gioco e pannello host: <https://trivia-challenge-iota.vercel.app/>
- Risposte spettatori: <https://trivia-challenge-iota.vercel.app/spectator.html>
- Classifica spettatori: <https://trivia-challenge-iota.vercel.app/leaderboard.html>

La pagina host richiede l'account Supabase dell'Admin. Giocatori e spettatori non
devono registrarsi: gli spettatori entrano dal QR con il solo nickname.

Questa versione è stata riallineata alla struttura dei file PowerPoint originali: schermata home in stile proiezione, sfondo blu/oro, pulsanti grandi arrotondati, barra punteggi in basso, scorciatoie `PUNTI`, `LISTA ANIME` e `POTERI`, schermata punti dedicata e minigiochi con layout più simili alle slide. I comandi host non sono più in un pannello separato: sono integrati nella stessa plancia 16:9 come HUD da videogame. In modalità fullscreen viene mandata a schermo intero solo la plancia del gioco, quindi la barra superiore dell'app non è visibile.

## Cosa include

- **Modalità Show** in formato 16:9, pensata per TV o proiettore.
- **Fullscreen presentazione**: usa il pulsante `⛶` o il tasto `F` per mostrare solo la plancia di gioco, senza header dell'app.
- **Home stile PowerPoint** con pulsanti per i minigiochi.
- **Preset separati Anime e Star Wars** selezionabili dalla Home, ciascuno con contenuti, layout, punteggi e avanzamento indipendenti.
- **HUD host integrato nella slide** con selezione giocatore, selezione minigioco, correzioni rapide, reset, log e link rapidi.
- **Scorebar fissa in basso** con giocatori/squadre selezionabili.
- **Grafica videogame dinamica** con glow neon, griglia futuristica, animazioni leggere, sweep luminosi e card effetto HUD.
- **Schermate speciali**: Punti, Lista Anime / argomenti, Poteri.
- **Admin panel** per creare, modificare, duplicare ed eliminare contenuti.
- **Punteggi manuali** con bonus, correzioni rapide e storico.
- **Import / export JSON** per backup e preparazione partite.
- **Modalità spettatore** con ingresso via QR/nickname, risposte da telefono e classifica live separata.
- **Supporto media**: immagini, video e audio tramite file locali o URL esterni.
- **Galleria immagini di riferimento** dalla cartella `public/reference-images/`.
- **Deploy statico su GitHub Pages** tramite workflow incluso.

## Minigiochi supportati

1. **Indovina il personaggio**: 4 indizi/immagini rivelabili in stile tile PowerPoint. Punteggi: 1000, 500, 250, 50.
   Nell'editor dei box puoi aggiungere/duplicare/eliminare slide e regolare adattamento, posizione X/Y e zoom del ritaglio per ogni immagine.
2. **Indovina il personaggio: Indizi**: 10 indizi progressivi; il valore disponibile diminuisce a ogni rivelazione.
3. **Geoguessr**: immagine di un luogo e risposta relativa al pianeta di appartenenza.
4. **Schiva la Bomba**: griglia da 20 elementi, 16 corretti e 4 bombe/intrusi. Ogni risposta corretta vale 50 punti.
5. **Chi l'ha detto**: audio da ascoltare e risposta rivelabile tramite immagine/video. 100 punti.
6. **Occhio al dettaglio**: dettaglio iniziale e immagine completa in risposta. 200 punti.
7. **Completa la Frase**: citazione parziale da completare perfettamente. 200 punti.
8. **Reazione a catena**: 20 domande sequenziali su un argomento. 50 punti ciascuna.
9. **Le Dieci Fatiche**: 10 domande miste. 100 punti ciascuna.
10. **Ghigliottina**: 5 parole collegate da una risposta comune. 200 punti.
11. **Passaparola**: 21 lettere dell'alfabeto italiano in disposizione circolare, con difficoltà e bonus finali.
12. **Jeopardy**: tabellone a categorie con valori diversi per difficoltà.
13. **Sarabanda**: 25 punti per titolo, 25 per artista, 50 punti a risposta completa.

## Preset Anime e Star Wars

Il selettore nella schermata principale consente di passare tra i due preset senza mescolarne lo stato:

- **Anime** viene creato acquisendo automaticamente il salvataggio presente nel browser al primo avvio della versione con preset. Mantiene gli undici giochi, la grafica e i contenuti già configurati.
- **Star Wars** contiene `Indovina il personaggio: Pixel`, `Indovina il personaggio: Indizi`, `Geoguessr`, `Jeopardy` e `Passaparola`, con un tema blu, oro e arancio dedicato.
- ogni modifica fatta dall'Admin viene salvata nel preset attivo;
- punteggi, avanzamento delle domande, layout e impostazioni restano indipendenti;
- l'importazione JSON sostituisce soltanto il preset attivo e l'esportazione produce il documento del preset attivo.

Il contenuto iniziale Star Wars include una sequenza Pixel completa di Qui-Gon Jinn, una domanda a dieci indizi su Jango Fett, un luogo Geoguessr di esempio e le categorie Jeopardy `Star Wish`, `TripWarsvisor`, `Tinderata Galattica`, `LinkedIn Spaziale` e `Titoli Clickbait`. Domande, alias accettati, immagini, punti e difficoltà restano modificabili dal pannello Admin.

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

I dati e il catalogo dei preset sono salvati nel `localStorage` del browser. Questo rende il tool immediato e senza backend, ma significa che:

- i dati restano sul browser/dispositivo usato;
- conviene esportare spesso il JSON;
- per condividere una partita con un altro computer basta importare il JSON esportato.

La modalità spettatore usa Supabase per risposte e punteggi e un relay Cloudflare Durable Objects per oltre 1.000 collegamenti realtime. Configurazione, migrazioni SQL e test di carico sono descritti in [`docs/AUDIENCE_MODE.md`](docs/AUDIENCE_MODE.md).

## Roadmap tecnica

La base attuale è una PWA statica con cache offline progressiva degli asset locali, schema dati versionato, timer e controlli media. I prossimi interventi sono descritti nella roadmap e privilegiano stabilità locale, test, ottimizzazione degli asset e qualità dell'editor.

Vedi anche [`docs/CONTENT_SCHEMA.md`](docs/CONTENT_SCHEMA.md) e [`docs/ROADMAP.md`](docs/ROADMAP.md).
