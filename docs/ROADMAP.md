# Roadmap tecnica e di prodotto

Questa roadmap porta Trivia Challenge dall'attuale prototipo avanzato a un'applicazione locale stabile, testabile e utilizzabile durante una partita dal vivo.

## Stato di avanzamento — 20 giugno 2026

- Completati: baseline Node, regole e punteggi P0, schema v2, migrazioni, separazione `session`, timer, controlli media, PWA offline e release gate CI.
- Completati: registro centrale degli 11 giochi, manifest dei 201 asset locali, suggerimenti asset nell'editor e modalità host/pubblico.
- In corso: ulteriore suddivisione del renderer monolitico e ottimizzazione fisica dei 63 asset oltre 2 MiB.
- Da verificare: test browser end-to-end e audit visivo responsive; il browser integrato non era disponibile durante l'ultima sessione di sviluppo.
- Il comando di accettazione corrente è `npm run release:check`.

## Vincoli e principi

- L'applicazione resta una web app statica eseguibile in locale e pubblicabile su GitHub Pages.
- Tutti gli asset di gioco sono locali e risiedono sotto `public/assets/`.
- Nessun CDN, media storage remoto o URL esterno è necessario per il funzionamento.
- I dati della partita restano locali. Import/export JSON è il meccanismo ufficiale di backup e trasferimento.
- Ogni fase deve lasciare l'app utilizzabile e non deve invalidare i salvataggi esistenti senza una migrazione.
- Prima si stabilizza il motore di gioco; multiplayer e backend non rientrano nell'obiettivo attuale.

## Priorità

| Livello | Significato |
|---|---|
| P0 | Blocca o altera una partita live |
| P1 | Rischia perdita dati, regressioni o manutenzione difficile |
| P2 | Migliora esperienza, prestazioni e accessibilità |
| P3 | Evoluzione successiva, non necessaria per la stabilità locale |

## Milestone 0 — Baseline riproducibile

**Obiettivo:** poter verificare ogni modifica in modo automatico.

### Attività

- [ ] Aggiungere `package.json` con script standard: `dev`, `check`, `test`, `test:e2e` e `assets:check`.
- [ ] Introdurre ESLint e Prettier senza riscrivere alla cieca il codice esistente.
- [ ] Aggiungere test unitari con Vitest per stato, punteggi, migrazioni e normalizzazione dei contenuti.
- [ ] Aggiungere test browser con Playwright per i flussi critici.
- [ ] Creare fixture JSON valide e non valide per ogni tipo di minigioco.
- [ ] Salvare una partita demo completa, priva di riferimenti a file inesistenti.
- [ ] Aggiungere alla CI i controlli di sintassi, test, link locali e dimensione degli asset.
- [ ] Documentare browser supportati, risoluzione consigliata e procedura di avvio.

### Test minimi di baseline

- Avvio pulito senza errori in console.
- Apertura di tutti gli 11 minigiochi.
- Import ed export di una partita.
- Assegnazione, sottrazione e annullamento punti.
- Entrata e uscita dal fullscreen.
- Verifica automatica di tutti i percorsi presenti nei dati demo.

### Criteri di completamento

- `npm run check` e `npm test` terminano con successo.
- La CI blocca una modifica che rompe un percorso asset o lo schema dati.
- La partita demo può essere giocata dall'inizio alla fine senza media mancanti.

## Milestone 1 — Correzione dei blocchi funzionali P0

**Obiettivo:** rendere affidabili tutti i minigiochi e il sistema punti.

### Motore comune delle azioni

- [ ] Definire azioni esplicite: `reveal`, `correct`, `wrong`, `pass`, `complete`, `reset` e `award`.
- [ ] Centralizzare l'assegnazione punti in un solo servizio.
- [ ] Rendere atomica l'operazione “segna esito + assegna punti + registra storico”.
- [ ] Impedire doppie assegnazioni accidentali tramite stato `completed` o conferma di riapertura.
- [ ] Mostrare sempre giocatore selezionato, valore assegnato e possibilità di annullamento.

### Correzioni per minigioco

#### Indovina il personaggio

- [ ] Collegare ogni reveal al valore corretto del box.
- [ ] Aggiungere azioni “Corretta” e “Nessun punto”.
- [ ] Bloccare ulteriori assegnazioni dopo la chiusura del round.
- [ ] Conservare correttamente round corrente e box rivelati.

#### Schiva la Bomba

- [ ] Distinguere selezione, conferma e reveal della soluzione.
- [ ] Calcolare punti dalle risposte corrette confermate.
- [ ] Definire esplicitamente l'effetto di una bomba sul punteggio.
- [ ] Registrare completamento e risultato del round.

#### Chi l'ha detto

- [ ] Visualizzare il media di risposta previsto dallo schema.
- [ ] Collegare il player audio reale ai controlli della schermata.
- [ ] Aggiungere esito e assegnazione dei punti.

#### Occhio al dettaglio

- [ ] Verificare passaggio affidabile tra dettaglio e immagine completa.
- [ ] Aggiungere esito, punti e stato completato.

#### Completa la frase

- [ ] Usare il valore `points` quando la risposta viene confermata.
- [ ] Marcare la domanda come completata e impedirne l'assegnazione doppia.

#### Reazione a catena

- [ ] Implementare stati `pending`, `current`, `correct`, `wrong` e `passed`.
- [ ] Collegare vite, avanzamento e punti al motore comune.
- [ ] Sostituire i controlli multimediali decorativi con azioni reali o rimuoverli.

#### Le Dieci Fatiche

- [ ] Rendere selezionabili le opzioni a risposta multipla.
- [ ] Mostrare risposta corretta e spiegazione senza perdere la selezione.
- [ ] Aggiornare lo stato della fatica nel tabellone.
- [ ] Applicare punti e completamento.

#### Ghigliottina

- [ ] Tracciare il numero di indizi utilizzati.
- [ ] Definire se il punteggio varia in base agli indizi e applicare la regola scelta.
- [ ] Chiudere il round dopo l'esito.

#### Passaparola

- [ ] Aggiungere l'azione “Corretta”.
- [ ] Applicare punti per difficoltà e bonus finale.
- [ ] Implementare avanzamento automatico alla prossima lettera valida.
- [ ] Gestire un secondo giro per le lettere passate.
- [ ] Calcolare correttamente fine partita e riepilogo.
- [ ] Allineare il valore `medio` tra codice e `CONTENT_SCHEMA.md`.

#### Jeopardy

- [ ] Correggere il controllo che oggi ignora `points` e callback di completamento.
- [ ] Marcare una domanda come `used` dopo la conferma dell'esito.
- [ ] Assegnare o sottrarre il valore della domanda al giocatore selezionato.
- [ ] Consentire la riapertura solo tramite un'azione host esplicita.

#### Sarabanda

- [ ] Collegare audio e controlli reali.
- [ ] Gestire separatamente titolo, artista e risposta completa.
- [ ] Applicare `pointsTitle` e `pointsArtist` senza duplicazioni.

### Criteri di completamento

- Ogni minigioco ha almeno un test del percorso corretto e uno del percorso errato.
- Nessun parametro dichiarato dal gioco viene ignorato dal renderer.
- Ogni assegnazione compare una sola volta nello storico ed è annullabile.
- Reset di domanda, round e partita hanno comportamento distinto e documentato.

## Milestone 2 — Stato, persistenza e schema P1

**Obiettivo:** eliminare perdita dati e import incompatibili.

### Modello dati

- [ ] Aggiungere `schemaVersion` al documento radice.
- [ ] Separare `content`, `session`, `settings` e `history`.
- [ ] Definire uno schema discriminato per ciascun `game.type`.
- [ ] Rendere obbligatori ID univoci e tipi coerenti.
- [ ] Rimuovere campi generici incompatibili, come il singolo input numerico per `points` di Passaparola.
- [ ] Aggiornare `CONTENT_SCHEMA.md` direttamente dallo schema o verificarne la coerenza in CI.

### Validazione e migrazioni

- [ ] Validare import e dati letti da `localStorage` prima dell'idratazione.
- [ ] Restituire errori con percorso preciso, per esempio `games[2].questions[4].answer`.
- [ ] Implementare migrazioni sequenziali tra versioni.
- [ ] Conservare una copia di sicurezza prima di ogni migrazione.
- [ ] Rifiutare file futuri con versione non supportata senza sovrascrivere i dati correnti.

### Persistenza

- [ ] Gestire eccezioni e quota esaurita di `localStorage`.
- [ ] Salvare con debounce durante modifiche ripetute e drag-and-drop.
- [ ] Separare undo editoriale da storico punti.
- [ ] Sostituire le 80 copie complete dello stato con operazioni inverse o snapshot limitati per sezione.
- [ ] Aggiungere export automatico suggerito prima di reset distruttivi o import.
- [ ] Aggiungere indicatore “salvato”, “modifiche in corso” o “salvataggio fallito”.

### Criteri di completamento

- Un JSON malformato non altera lo stato corrente.
- Un salvataggio della versione precedente viene migrato automaticamente.
- Un errore di persistenza è visibile e recuperabile.
- Import/export mantiene integralmente contenuti, layout e stato previsto.

## Milestone 3 — Refactoring architetturale P1

**Obiettivo:** ridurre il rischio di regressione senza cambiare l'esperienza utente.

### Struttura proposta

```text
src/
  app.js
  core/
    actions.js
    game-registry.js
    scoring.js
    state.js
    storage.js
    validation.js
  games/
    bomb.js
    chain.js
    detail.js
    guess.js
    guillotine.js
    jeopardy.js
    labors.js
    pass.js
    quote.js
    said.js
    sarabanda.js
  editor/
    content-editors.js
    layout-editor.js
    slide-editor.js
  ui/
    dom.js
    media.js
    scoreboard.js
    stage.js
    toast.js
  styles/
    base.css
    editor.css
    games.css
    show.css
    fullscreen.css
```

### Attività

- [ ] Estrarre prima funzioni pure: normalizzazione, punteggi e selettori.
- [ ] Creare un registro dei giochi anziché uno switch implicito nel renderer.
- [ ] Dare a ogni gioco un contratto comune: `normalize`, `render`, `reset` e `getResult`.
- [ ] Separare stato persistente dallo stato transitorio dell'interfaccia.
- [ ] Evitare il rerender completo per playback audio, timer, drag e pannelli rapidi.
- [ ] Usare `AbortController`, pointer capture o `pointercancel` per ripulire sempre gli handler di trascinamento.
- [ ] Suddividere il CSS per responsabilità ed eliminare override duplicati.
- [ ] Impostare una convenzione unica per nomi, classi, unità e z-index.

### Criteri di completamento

- Nessun modulo di gioco contiene logica di persistenza diretta.
- Aggiungere un nuovo tipo di gioco non richiede modifiche trasversali in più switch.
- Audio e timer non vengono riavviati da modifiche indipendenti al punteggio.
- I test introdotti nelle milestone precedenti restano verdi durante il refactoring.

## Milestone 4 — Gestione asset locali P1/P2

**Obiettivo:** mantenere tutti i media locali senza appesantire inutilmente repository e deploy.

### Regole degli asset

- [ ] Accettare come formato dati solo percorsi relativi sotto `public/assets/`.
- [ ] Rifiutare URL `http:`, `https:`, `data:` e percorsi che escono dalla cartella prevista.
- [ ] Definire una struttura per gioco o evento, con nomi minuscoli e senza spazi quando possibile.
- [ ] Correggere refusi e nomi opachi mantenendo una mappa di migrazione per i contenuti esistenti.
- [ ] Aggiungere un manifest locale con percorso, tipo MIME, dimensioni e utilizzi.

### Pipeline locale

- [ ] Creare uno script che individui asset mancanti, inutilizzati e duplicati.
- [ ] Convertire fotografie PNG in WebP o AVIF, mantenendo PNG solo quando serve trasparenza.
- [ ] Generare thumbnail locali per editor, gallerie e griglie.
- [ ] Definire limiti indicativi: thumbnail 100–200 KB, immagini di gioco 500 KB–1 MB, sfondi 1–2 MB.
- [ ] Conservare eventuali originali fuori dalla cartella pubblicata oppure in un archivio separato.
- [ ] Precaricare soltanto i media del round imminente e usare lazy loading per il resto.
- [ ] Rendere esplicito nell'editor se un file locale non esiste o ha un formato non supportato.

### Contenuti iniziali

- [ ] Sostituire tutti i riferimenti placeholder inesistenti.
- [ ] Collegare gli asset già presenti a una partita demo coerente.
- [ ] Separare le immagini di riferimento PowerPoint dai media effettivamente usati.
- [ ] Aggiungere attribuzione/licenza locale dove necessaria.

### Criteri di completamento

- Zero riferimenti a file mancanti nella demo e nei test.
- Nessun media remoto necessario durante una partita.
- Il controllo asset fallisce in CI quando viene eliminato un file ancora referenziato.
- Il peso pubblicato è misurato e significativamente inferiore alla baseline.

## Milestone 5 — Modalità show e media P2

**Obiettivo:** rendere la conduzione fluida su TV e proiettore.

### Vista e fullscreen

- [ ] Scegliere e documentare un unico target fullscreen (`#app` oppure `.ppt-stage`).
- [ ] Allineare comportamento, README e messaggi dell'interfaccia.
- [ ] Verificare 1280×720, 1920×1080, 2560×1440 e viewport stretti.
- [ ] Rendere la scorebar adattiva a 1–8 giocatori senza sovrapposizioni.
- [ ] Separare almeno tramite modalità UI i controlli host dagli elementi destinati al pubblico.

### Timer

- [ ] Implementare un timer condiviso con `start`, `pause`, `resume`, `reset` ed `expire`.
- [ ] Basare il tempo su timestamp, non sul numero di tick, per evitare deriva.
- [ ] Rendere durata e comportamento alla scadenza configurabili per gioco.
- [ ] Persistire solo ciò che serve a ripristinare una sessione interrotta.
- [ ] Aggiungere avvisi visivi e sonori locali disattivabili.

### Audio e video

- [ ] Creare un controller media unico.
- [ ] Collegare play, pausa, ritorno all'inizio e volume.
- [ ] Arrestare il media quando si cambia domanda o gioco.
- [ ] Non arrestarlo quando si apre un pannello punteggio non correlato.
- [ ] Gestire file mancanti e codec non supportati con messaggi leggibili.

### Scorciatoie host

- [ ] Definire scorciatoie per reveal, corretta, errata, passo, timer e navigazione.
- [ ] Ignorare le scorciatoie durante la scrittura in input o editor.
- [ ] Mostrare un pannello di aiuto richiamabile.

### Criteri di completamento

- Una partita completa è conducibile senza uscire dalla modalità show.
- Timer e audio non dipendono dal frame rate o dai rerender.
- Tutti i controlli essenziali sono utilizzabili anche da tastiera.

## Milestone 6 — Editor locale P2

**Obiettivo:** ridurre la necessità di modificare JSON manualmente.

### Attività

- [ ] Creare un form specifico per ciascun tipo di gioco.
- [ ] Mostrare errori di validazione accanto al campo interessato.
- [ ] Aggiungere ricerca/selezione dei file già presenti nel manifest locale.
- [ ] Non implementare upload remoto: il selettore deve produrre percorsi locali validi.
- [ ] Aggiungere anteprima di immagine, audio e video.
- [ ] Consentire riordino, duplicazione e cancellazione di domande con conferma.
- [ ] Aggiungere “salva e prova” per aprire direttamente il contenuto modificato.
- [ ] Gestire separatamente editor visuale e JSON avanzato, con sincronizzazione esplicita.
- [ ] Avvisare prima di sovrascrivere modifiche divergenti tra form e JSON.

### Criteri di completamento

- Tutti i campi documentati nello schema sono modificabili da form.
- L'utente non può salvare uno stato strutturalmente invalido.
- Nessuna operazione editoriale interrompe o corrompe una partita salvata.

## Milestone 7 — Accessibilità e qualità UX P2

**Obiettivo:** rendere l'app leggibile e controllabile in condizioni reali.

### Attività

- [ ] Ripristinare `cursor: pointer` sui controlli interattivi.
- [ ] Aggiungere focus visibile coerente a pulsanti, link, select e campi.
- [ ] Aggiungere `aria-live` a toast, timer e variazioni di punteggio.
- [ ] Fornire nomi accessibili ai controlli a sola icona.
- [ ] Non comunicare corretto/errato soltanto tramite colore.
- [ ] Verificare contrasto WCAG AA per testo e controlli.
- [ ] Supportare `prefers-reduced-motion`.
- [ ] Correggere ordine del focus in modali, pannelli e modalità modifica.
- [ ] Aggiungere conferme mirate alle sole azioni distruttive.
- [ ] Mostrare stati vuoti e messaggi di errore utili per ogni schermata.

### Criteri di completamento

- I flussi host principali sono completabili da tastiera.
- Audit automatico senza errori critici di accessibilità.
- Animazioni non essenziali disattivate con reduced motion.

## Milestone 8 — Offline, packaging e documentazione P2

**Obiettivo:** decidere e completare il modello di distribuzione locale.

### Opzione consigliata: PWA locale completa

- [ ] Aggiungere service worker con strategia di cache versionata.
- [ ] Precache soltanto shell e asset essenziali; cache on demand per i media locali.
- [ ] Aggiungere icone manifest nelle dimensioni richieste.
- [ ] Ospitare localmente i font oppure usare font di sistema.
- [ ] Mostrare disponibilità di aggiornamento senza ricaricare durante una partita.
- [ ] Testare primo avvio online e riavvio completamente offline.

Se il service worker non viene implementato, rimuovere la definizione “PWA” e documentare l'app come SPA statica locale.

### Documentazione

- [ ] Sincronizzare README, schema e comportamento fullscreen.
- [ ] Documentare struttura degli asset locali e formati supportati.
- [ ] Documentare backup, ripristino e migrazione.
- [ ] Aggiungere guida rapida per host e guida separata per editor.
- [ ] Generare una checklist pre-partita: asset, audio, fullscreen, backup e risoluzione.

### Criteri di completamento

- La descrizione del prodotto corrisponde alle funzionalità realmente disponibili.
- Nessuna dipendenza di rete è necessaria dopo l'installazione/cache iniziale.
- È disponibile una procedura verificata di ripristino dei dati.

## Milestone 9 — Hardening e release 1.0 P1/P2

**Obiettivo:** dichiarare una versione stabile per uso reale.

### Matrice di test end-to-end

- [ ] Creazione e modifica di ogni minigioco.
- [ ] Esecuzione completa di ogni minigioco.
- [ ] Punteggio corretto, errato, bonus, penalità e undo.
- [ ] Reset domanda, round, gioco e partita.
- [ ] Import valido, import invalido e migrazione.
- [ ] Asset mancante, audio non supportato e immagine corrotta.
- [ ] Fullscreen, refresh accidentale e ripristino sessione.
- [ ] Uso con 1, 3, 4 e 8 giocatori.
- [ ] Uso da tastiera e reduced motion.
- [ ] Funzionamento offline con tutti gli asset locali richiesti.

### Release

- [ ] Definire versionamento semantico e changelog.
- [ ] Bloccare il deploy se test, schema o asset check falliscono.
- [ ] Generare artifact statico contenente soltanto file necessari.
- [ ] Creare tag e backup della demo compatibile con la release.
- [ ] Documentare problemi noti e procedura di rollback.

### Definition of Done 1.0

- Tutti i P0 e P1 sono chiusi.
- Tutti gli 11 minigiochi sono completabili e testati.
- Nessun asset della demo è mancante o remoto.
- Import, migrazione e salvataggio sono recuperabili in caso di errore.
- Una partita completa può essere condotta offline senza errori in console.
- README, schema e applicazione descrivono le stesse regole.

## Evoluzioni successive P3

Queste funzionalità vanno considerate soltanto dopo la release locale stabile:

- Vista pubblico separata su un secondo schermo.
- Telecomando host sulla rete locale.
- Buzzer e join da smartphone sulla LAN.
- Statistiche avanzate e archivio di più partite.
- Pacchetti locali di contenuti importabili.

Anche in queste evoluzioni gli asset possono restare locali al dispositivo host; un eventuale backend non deve essere introdotto solo per distribuire media.

## Ordine di esecuzione consigliato

1. Milestone 0 e bug P0 della Milestone 1.
2. Completamento del motore di gioco e dei singoli minigiochi.
3. Schema, migrazioni e persistenza.
4. Refactoring modulare protetto dai test.
5. Pipeline e ottimizzazione degli asset locali.
6. Timer, media, fullscreen e modalità show.
7. Editor visuale, accessibilità e offline.
8. Hardening e release 1.0.

Non conviene iniziare dal refactoring totale o dal multiplayer: prima vanno congelati tramite test i comportamenti corretti del motore di gioco.
