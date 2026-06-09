# Trivia Challenge

Tool web per ricreare e gestire il gioco **Trivia Challenge** nato da PowerPoint.

Questa versione è stata riallineata alla struttura dei file PowerPoint originali: schermata home in stile proiezione, sfondo blu/oro, pulsanti grandi arrotondati, barra punteggi in basso, scorciatoie `PUNTI`, `LISTA ANIME` e `POTERI`, schermata punti dedicata e minigiochi con layout più simili alle slide.

## Cosa include

- **Modalità Show** in formato 16:9, pensata per TV o proiettore.
- **Home stile PowerPoint** con pulsanti per i minigiochi.
- **Scorebar fissa in basso** con giocatori/squadre selezionabili.
- **Schermate speciali**: Punti, Lista Anime / argomenti, Poteri.
- **Admin panel** per creare, modificare, duplicare ed eliminare contenuti.
- **Punteggi manuali** con bonus, correzioni rapide e storico.
- **Import / export JSON** per backup e preparazione partite.
- **Supporto media**: immagini, video e audio tramite file locali o URL esterni.
- **Galleria immagini di riferimento** dalla cartella `public/reference-images/`.
- **Deploy statico su GitHub Pages** tramite workflow incluso.

## Minigiochi supportati

1. **Indovina il personaggio**: 4 indizi/immagini rivelabili in stile tile PowerPoint. Punteggi: 1000, 500, 250, 50.
2. **Schiva la Bomba**: griglia da 20 elementi, 16 corretti e 4 bombe/intrusi. Ogni risposta corretta vale 50 punti.
3. **Chi l'ha detto**: audio da ascoltare e risposta rivelabile tramite immagine/video. 100 punti.
4. **Occhio al dettaglio**: dettaglio iniziale e immagine completa in risposta. 200 punti.
5. **Completa la Frase**: citazione parziale da completare perfettamente. 200 punti.
6. **Reazione a catena**: 20 domande sequenziali su un argomento. 50 punti ciascuna.
7. **Le Dieci Fatiche**: 10 domande miste. 100 punti ciascuna.
8. **Ghigliottina**: 5 parole collegate da una risposta comune. 200 punti.
9. **Passaparola**: 21 lettere dell'alfabeto italiano in disposizione circolare, con difficoltà e bonus finali.
10. **Jeopardy**: tabellone a categorie con valori diversi per difficoltà.
11. **Sarabanda**: 25 punti per titolo, 25 per artista, 50 per risposta completa.

## Come avviarlo in locale

Non servono dipendenze.

```bash
python3 -m http.server 5173
```

Poi apri:

```text
http://localhost:5173
```

## Dove mettere immagini, video e audio

Inserisci i file dentro:

```text
public/assets/
```

Poi nel JSON admin usa percorsi come:

```json
"public/assets/personaggio-1.jpg"
```

Puoi anche usare link esterni assoluti, ad esempio `https://.../immagine.jpg`.

## Immagini di riferimento

Le immagini esportate dai PowerPoint sono in:

```text
public/reference-images/
```

L'app le usa come riferimento visivo dentro l'admin, senza confonderle con i media reali delle domande. I media delle domande restano in `public/assets/`.

## Workflow consigliato

1. Vai in **Show** per usare la versione da proiettare.
2. Usa la home per aprire un minigioco, oppure le scorciatoie **PUNTI**, **LISTA ANIME** e **POTERI**.
3. Seleziona il giocatore attivo dalla console host.
4. Rivela indizi, mostra risposte e assegna punti.
5. Vai in **Punteggi** per correzioni manuali più grandi.
6. Vai in **Admin** per creare/modificare i minigiochi e aggiornare lista anime, poteri e giocatori.
7. A fine preparazione usa **Esporta JSON** come backup della partita.

## Persistenza dei dati

I dati sono salvati nel `localStorage` del browser. Questo rende il tool immediato e senza backend, ma significa che:

- i dati restano sul browser/dispositivo usato;
- conviene esportare spesso il JSON;
- per condividere una partita con un altro computer basta importare il JSON esportato.

## Roadmap tecnica

La base attuale è una PWA statica. I prossimi step naturali sono: form visuali dedicati per ogni minigioco, upload media dall'admin, timer reale, effetti sonori, animazioni reveal più fedeli alle transizioni PowerPoint, database remoto, modalità player da smartphone, buzzer e lobby multiplayer.

Vedi anche [`docs/CONTENT_SCHEMA.md`](docs/CONTENT_SCHEMA.md) e [`docs/ROADMAP.md`](docs/ROADMAP.md).
