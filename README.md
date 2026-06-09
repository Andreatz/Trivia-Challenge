# Trivia Challenge

Tool web per ricreare e gestire il gioco **Trivia Challenge** nato da PowerPoint.

L'app è pensata per un presentatore/host: si creano i minigiochi in area admin, si mostrano domande e indizi in modalità presentazione, si assegnano punti ai giocatori e si possono correggere manualmente i punteggi in qualsiasi momento.

## Cosa include

- **Presentazione live** dei minigiochi.
- **Admin panel** per creare, modificare, duplicare ed eliminare contenuti.
- **Gestione giocatori/squadre**.
- **Punteggi manuali** con bonus, correzioni e storico delle assegnazioni.
- **Import / export JSON** per salvare backup o preparare partite diverse.
- **Supporto media**: immagini, video e audio tramite file locali o URL esterni.
- **Deploy statico su GitHub Pages** tramite workflow già incluso.

## Minigiochi supportati

1. **Indovina il personaggio**: 4 immagini rivelate una alla volta. Punteggi: 1000, 500, 250, 50.
2. **Schiva la Bomba**: 20 elementi, 16 corretti e 4 bombe/intrusi. Ogni risposta corretta vale 50 punti.
3. **Chi l'ha detto**: audio da ascoltare e risposta rivelabile tramite immagine/video. 100 punti.
4. **Occhio al dettaglio**: dettaglio iniziale e immagine completa in risposta. 200 punti.
5. **Completa la Frase**: citazione parziale da completare perfettamente. 200 punti.
6. **Reazione a catena**: 20 domande sequenziali su un argomento. 50 punti ciascuna.
7. **Le Dieci Fatiche**: 10 domande miste. 100 punti ciascuna.
8. **Ghigliottina**: 5 parole collegate da una risposta comune. 200 punti.
9. **Passaparola**: 21 lettere dell'alfabeto italiano, con difficoltà e bonus finali.
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

## Workflow consigliato

1. Vai in **Admin**.
2. Scegli il tipo di minigioco.
3. Modifica il JSON generato dal template.
4. Salva.
5. Vai in **Presenta**.
6. Seleziona minigioco e giocatore/squadra attiva.
7. Rivela indizi, mostra risposte e assegna punti.
8. Usa **Punteggi** per correggere manualmente.
9. A fine preparazione usa **Esporta JSON** come backup della partita.

## Persistenza dei dati

I dati sono salvati nel `localStorage` del browser. Questo rende il tool immediato e senza backend, ma significa che:

- i dati restano sul browser/dispositivo usato;
- conviene esportare spesso il JSON;
- per condividere una partita con un altro computer basta importare il JSON esportato.

## Roadmap tecnica

La base attuale è una PWA statica. I prossimi step naturali sono autenticazione admin, database remoto, modalità player con buzzers da smartphone, upload media dall'admin, timer per round, lobby multiplayer e tema grafico definitivo basato sugli screenshot del PowerPoint originale.

Vedi anche [`docs/CONTENT_SCHEMA.md`](docs/CONTENT_SCHEMA.md) e [`docs/ROADMAP.md`](docs/ROADMAP.md).
