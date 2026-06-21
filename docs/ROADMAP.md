# Roadmap tecnica e di prodotto

Questa roadmap porta Trivia Challenge dall'attuale prototipo avanzato a un'applicazione locale stabile, testabile e utilizzabile durante una partita dal vivo.

## Stato di avanzamento — 21 giugno 2026

- Completate tutte le milestone funzionali: motore, schema v3, persistenza, editor, modalità show, accessibilità, PWA e pipeline degli asset esclusivamente locali.
- Gli 11 giochi adottano il contratto comune `normalize`, `render`, `reset`, `getResult` e sono coperti da flussi browser completi.
- Verificati 42 test unitari e 66 test browser Playwright; 6 casi duplicati sono saltati intenzionalmente perché i due flussi editoriali completi vengono eseguiti una sola volta a 1280×720.
- Verificati 202 asset pubblicati, 198 thumbnail locali e una demo con 11 giochi e 11 riferimenti media validi.
- `npm run release:check` è il comando di accettazione e risulta verde.
- Rimane solo l'operazione di pubblicazione Git: creare commit e tag quando il worktree sarà approvato. Il backup release della demo è già disponibile in `release/0.2.0/`.

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

## Milestone 0 — Baseline riproducibile (completata)

**Obiettivo:** poter verificare ogni modifica in modo automatico.

### Attività

- [x] Aggiungere `package.json` con script standard: `dev`, `check`, `test`, `test:e2e` e `assets:check`.
- [x] Introdurre ESLint e Prettier senza riscrivere alla cieca il codice esistente.
- [x] Aggiungere test unitari con Vitest per stato, punteggi, migrazioni e normalizzazione dei contenuti.
- [x] Aggiungere test browser con Playwright per i flussi critici.
- [x] Creare fixture JSON valide e non valide per ogni tipo di minigioco.
- [x] Salvare una partita demo completa, priva di riferimenti a file inesistenti.
- [x] Aggiungere alla CI i controlli di sintassi, test, link locali e dimensione degli asset.
- [x] Documentare browser supportati, risoluzione consigliata e procedura di avvio.

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

## Milestone 1 — Correzione dei blocchi funzionali P0 (implementata; E2E aperti)

**Obiettivo:** rendere affidabili tutti i minigiochi e il sistema punti.

### Motore comune delle azioni

- [x] Definire azioni esplicite: `reveal`, `correct`, `wrong`, `pass`, `complete`, `reset` e `award`.
- [x] Centralizzare l'assegnazione punti in un solo servizio.
- [x] Rendere atomica l'operazione “segna esito + assegna punti + registra storico”.
- [x] Impedire doppie assegnazioni accidentali tramite stato `completed` o conferma di riapertura.
- [x] Mostrare sempre giocatore selezionato, valore assegnato e possibilità di annullamento.

### Correzioni per minigioco

#### Indovina il personaggio

- [x] Collegare ogni reveal al valore corretto del box.
- [x] Aggiungere azioni “Corretta” e “Nessun punto”.
- [x] Bloccare ulteriori assegnazioni dopo la chiusura del round.
- [x] Conservare correttamente round corrente e box rivelati.

#### Schiva la Bomba

- [x] Distinguere selezione, conferma e reveal della soluzione.
- [x] Calcolare punti dalle risposte corrette confermate.
- [x] Definire esplicitamente l'effetto di una bomba sul punteggio.
- [x] Registrare completamento e risultato del round.

#### Chi l'ha detto

- [x] Visualizzare il media di risposta previsto dallo schema.
- [x] Collegare il player audio reale ai controlli della schermata.
- [x] Aggiungere esito e assegnazione dei punti.

#### Occhio al dettaglio

- [x] Verificare passaggio affidabile tra dettaglio e immagine completa.
- [x] Aggiungere esito, punti e stato completato.

#### Completa la frase

- [x] Usare il valore `points` quando la risposta viene confermata.
- [x] Marcare la domanda come completata e impedirne l'assegnazione doppia.

#### Reazione a catena

- [x] Implementare stati `pending`, `current`, `correct`, `wrong` e `passed`.
- [x] Collegare vite, avanzamento e punti al motore comune.
- [x] Sostituire i controlli multimediali decorativi con azioni reali o rimuoverli.

#### Le Dieci Fatiche

- [x] Rendere selezionabili le opzioni a risposta multipla.
- [x] Mostrare risposta corretta e spiegazione senza perdere la selezione.
- [x] Aggiornare lo stato della fatica nel tabellone.
- [x] Applicare punti e completamento.

#### Ghigliottina

- [x] Tracciare il numero di indizi utilizzati.
- [x] Definire se il punteggio varia in base agli indizi e applicare la regola scelta.
- [x] Chiudere il round dopo l'esito.

#### Passaparola

- [x] Aggiungere l'azione “Corretta”.
- [x] Applicare punti per difficoltà e bonus finale.
- [x] Implementare avanzamento automatico alla prossima lettera valida.
- [x] Gestire un secondo giro per le lettere passate.
- [x] Calcolare correttamente fine partita e riepilogo.
- [x] Allineare il valore `medio` tra codice e `CONTENT_SCHEMA.md`.

#### Jeopardy

- [x] Correggere il controllo che oggi ignora `points` e callback di completamento.
- [x] Marcare una domanda come `used` dopo la conferma dell'esito.
- [x] Assegnare o sottrarre il valore della domanda al giocatore selezionato.
- [x] Consentire la riapertura solo tramite un'azione host esplicita.

#### Sarabanda

- [x] Collegare audio e controlli reali.
- [x] Gestire separatamente titolo, artista e risposta completa.
- [x] Applicare `pointsTitle` e `pointsArtist` senza duplicazioni.

### Criteri di completamento

- Ogni minigioco ha almeno un test del percorso corretto e uno del percorso errato.
- Nessun parametro dichiarato dal gioco viene ignorato dal renderer.
- Ogni assegnazione compare una sola volta nello storico ed è annullabile.
- Reset di domanda, round e partita hanno comportamento distinto e documentato.

## Milestone 2 — Stato, persistenza e schema P1 (completata)

**Obiettivo:** eliminare perdita dati e import incompatibili.

### Modello dati

- [x] Aggiungere `schemaVersion` al documento radice.
- [x] Separare `content`, `session`, `settings` e `history`.
- [x] Definire uno schema discriminato per ciascun `game.type`.
- [x] Rendere obbligatori ID univoci e tipi coerenti.
- [x] Rimuovere campi generici incompatibili, come il singolo input numerico per `points` di Passaparola.
- [x] Aggiornare `CONTENT_SCHEMA.md` direttamente dallo schema o verificarne la coerenza in CI.

### Validazione e migrazioni

- [x] Validare import e dati letti da `localStorage` prima dell'idratazione.
- [x] Restituire errori con percorso preciso, per esempio `games[2].questions[4].answer`.
- [x] Implementare migrazioni sequenziali tra versioni.
- [x] Conservare una copia di sicurezza prima di ogni import/migrazione.
- [x] Rifiutare file futuri con versione non supportata senza sovrascrivere i dati correnti.

### Persistenza

- [x] Gestire eccezioni e quota esaurita di `localStorage`.
- [x] Salvare con debounce durante modifiche ripetute e drag-and-drop.
- [x] Separare undo editoriale da storico punti.
- [x] Sostituire le 80 copie complete dello stato con operazioni inverse o snapshot limitati per sezione.
- [x] Aggiungere export automatico suggerito prima di reset distruttivi o import.
- [x] Aggiungere indicatore “salvato”, “modifiche in corso” o “salvataggio fallito”.

### Criteri di completamento

- Un JSON malformato non altera lo stato corrente.
- Un salvataggio della versione precedente viene migrato automaticamente.
- Un errore di persistenza è visibile e recuperabile.
- Import/export mantiene integralmente contenuti, layout e stato previsto.

## Milestone 3 — Refactoring architetturale P1 (completata)

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

- [x] Estrarre prima funzioni pure: normalizzazione, punteggi e selettori.
- [x] Creare un registro dei giochi anziché uno switch implicito nel renderer.
- [x] Dare a ogni gioco un contratto comune: `normalize`, `render`, `reset` e `getResult`.
- [x] Separare stato persistente dallo stato transitorio dell'interfaccia.
- [x] Evitare il rerender completo per playback audio, timer, drag e pannelli rapidi.
- [x] Usare `AbortController`, pointer capture o `pointercancel` per ripulire sempre gli handler di trascinamento.
- [x] Suddividere il CSS per responsabilità ed eliminare override duplicati.
- [x] Impostare una convenzione unica per nomi, classi, unità e z-index.

### Criteri di completamento

- Nessun modulo di gioco contiene logica di persistenza diretta.
- Aggiungere un nuovo tipo di gioco non richiede modifiche trasversali in più switch.
- Audio e timer non vengono riavviati da modifiche indipendenti al punteggio.
- I test introdotti nelle milestone precedenti restano verdi durante il refactoring.

## Milestone 4 — Gestione asset locali P1/P2 (completata)

**Obiettivo:** mantenere tutti i media locali senza appesantire inutilmente repository e deploy.

### Regole degli asset

- [x] Accettare come formato dati solo percorsi relativi sotto `public/assets/`.
- [x] Rifiutare URL `http:`, `https:`, `data:` e percorsi che escono dalla cartella prevista.
- [x] Definire una struttura per gioco o evento, con nomi minuscoli e senza spazi quando possibile.
- [x] Correggere refusi e nomi opachi mantenendo una mappa di migrazione per i contenuti esistenti.
- [x] Aggiungere un manifest locale con percorso, tipo MIME e dimensioni.

### Pipeline locale

- [x] Creare uno script che individui asset mancanti, inutilizzati e duplicati.
- [x] Convertire selettivamente in WebP le fotografie usate dalla demo, mantenendo gli originali nell'archivio locale.
- [x] Generare thumbnail locali per editor, gallerie e griglie.
- [x] Definire limiti indicativi e un limite bloccante CI di 8 MiB.
- [x] Conservare eventuali originali fuori dalla cartella pubblicata oppure in un archivio separato.
- [x] Precaricare soltanto i media del round imminente e usare lazy loading per il resto.
- [x] Rendere esplicito nell'editor se un file locale non esiste o ha un formato non supportato.

### Contenuti iniziali

- [x] Sostituire tutti i riferimenti placeholder inesistenti.
- [x] Collegare gli asset già presenti a una partita demo coerente.
- [x] Separare le immagini di riferimento PowerPoint dai media effettivamente usati.
- [x] Aggiungere attribuzione/licenza locale dove necessaria.

### Criteri di completamento

- Zero riferimenti a file mancanti nella demo e nei test.
- Nessun media remoto necessario durante una partita.
- Il controllo asset fallisce in CI quando viene eliminato un file ancora referenziato.
- Il peso pubblicato è misurato e significativamente inferiore alla baseline.

## Milestone 5 — Modalità show e media P2 (completata)

**Obiettivo:** rendere la conduzione fluida su TV e proiettore.

### Vista e fullscreen

- [x] Scegliere e documentare un unico target fullscreen (`#app`).
- [x] Allineare comportamento, README e messaggi dell'interfaccia.
- [x] Verificare automaticamente mobile, 1280×720, 1920×1080 e 2560×1440 senza overflow.
- [x] Rendere la scorebar adattiva a 1–8 giocatori senza sovrapposizioni.
- [x] Separare tramite modalità UI i controlli host dagli elementi destinati al pubblico.

### Timer

- [x] Implementare un timer condiviso con `start`, `pause`, `resume`, `reset` ed `expire`.
- [x] Basare il tempo su timestamp, non sul numero di tick, per evitare deriva.
- [x] Rendere la durata configurabile per gioco.
- [x] Persistire solo ciò che serve a ripristinare una sessione interrotta.
- [x] Aggiungere avvisi visivi e sonori locali disattivabili.

### Audio e video

- [x] Creare un controller media unico.
- [x] Collegare play, pausa e ritorno all'inizio; il volume resta disponibile nei controlli nativi.
- [x] Arrestare il media quando si cambia domanda o gioco.
- [x] Non arrestarlo quando si apre un pannello punteggio non correlato.
- [x] Gestire file mancanti e codec non supportati con messaggi leggibili.

### Scorciatoie host

- [x] Definire scorciatoie per reveal, corretta, errata, passo, timer e navigazione.
- [x] Ignorare le scorciatoie durante la scrittura in input o editor.
- [x] Mostrare un pannello di aiuto richiamabile.

### Criteri di completamento

- Una partita completa è conducibile senza uscire dalla modalità show.
- Timer e audio non dipendono dal frame rate o dai rerender.
- Tutti i controlli essenziali sono utilizzabili anche da tastiera.

## Milestone 6 — Editor locale P2 (completata)

**Obiettivo:** ridurre la necessità di modificare JSON manualmente.

### Attività

- [x] Creare form visuali per gli 11 tipi di gioco, mantenendo il JSON avanzato.
- [x] Mostrare errori di validazione accanto al campo interessato.
- [x] Aggiungere ricerca/selezione dei file già presenti nel manifest locale.
- [x] Non implementare upload remoto: il selettore produce percorsi locali validi.
- [x] Aggiungere anteprima di immagine, audio e video.
- [x] Consentire riordino, duplicazione e cancellazione di domande con conferma.
- [x] Aggiungere “salva e prova” per aprire direttamente il contenuto modificato.
- [x] Gestire separatamente editor visuale e JSON avanzato, con sincronizzazione esplicita.
- [x] Avvisare prima di sovrascrivere modifiche divergenti tra form e JSON.

### Criteri di completamento

- Tutti i campi documentati nello schema sono modificabili da form.
- L'utente non può salvare uno stato strutturalmente invalido.
- Nessuna operazione editoriale interrompe o corrompe una partita salvata.

## Milestone 7 — Accessibilità e qualità UX P2 (completata)

**Obiettivo:** rendere l'app leggibile e controllabile in condizioni reali.

### Attività

- [x] Ripristinare `cursor: pointer` sui controlli interattivi.
- [x] Aggiungere focus visibile coerente a pulsanti, link, select e campi.
- [x] Aggiungere `aria-live` a toast, timer e variazioni di punteggio.
- [x] Fornire nomi accessibili ai controlli a sola icona.
- [x] Non comunicare corretto/errato soltanto tramite colore.
- [x] Verificare automaticamente Home e Admin con Axe WCAG A/AA.
- [x] Supportare `prefers-reduced-motion`.
- [x] Correggere ordine del focus in modali, pannelli e modalità modifica.
- [x] Aggiungere conferme mirate alle azioni distruttive principali.
- [x] Mostrare stati vuoti e messaggi di errore utili per ogni schermata.

### Criteri di completamento

- I flussi host principali sono completabili da tastiera.
- Audit automatico senza errori critici di accessibilità su Home e Admin.
- Animazioni non essenziali disattivate con reduced motion.

## Milestone 8 — Offline, packaging e documentazione P2 (completata)

**Obiettivo:** decidere e completare il modello di distribuzione locale.

### Opzione consigliata: PWA locale completa

- [x] Aggiungere service worker con strategia di cache versionata.
- [x] Precache soltanto shell e asset essenziali; cache on demand per i media locali.
- [x] Aggiungere icona SVG scalabile al manifest.
- [x] Usare font di sistema senza richieste remote.
- [x] Mostrare disponibilità di aggiornamento senza ricaricare durante una partita.
- [x] Testare primo avvio online e riavvio completamente offline.

Se il service worker non viene implementato, rimuovere la definizione “PWA” e documentare l'app come SPA statica locale.

### Documentazione

- [x] Sincronizzare README, schema e comportamento fullscreen.
- [x] Documentare struttura degli asset locali e formati supportati.
- [x] Documentare backup e migrazione.
- [x] Aggiungere guida rapida per host e guida separata per editor.
- [x] Generare una checklist pre-partita: asset, audio, fullscreen, backup e risoluzione.

### Criteri di completamento

- La descrizione del prodotto corrisponde alle funzionalità realmente disponibili.
- Nessuna dipendenza di rete è necessaria dopo l'installazione/cache iniziale.
- È disponibile una procedura verificata di ripristino dei dati.

## Milestone 9 — Hardening e release 1.0 P1/P2 (release gate ed E2E attivi)

**Obiettivo:** dichiarare una versione stabile per uso reale.

### Matrice di test end-to-end

- [x] Creazione e modifica di ogni minigioco.
- [x] Apertura e rendering senza errori di tutti gli 11 minigiochi.
- [x] Esecuzione completa di ogni minigioco.
- [x] Punteggio corretto, errato, bonus, penalità e undo.
- [x] Reset domanda, round, gioco e partita.
- [x] Import valido, import invalido e migrazione.
- [x] Asset mancante, audio non supportato e immagine corrotta.
- [x] Fullscreen, refresh accidentale e ripristino sessione.
- [x] Uso con 1, 3, 4 e 8 giocatori.
- [x] Navigazione host da tastiera e modalità pubblico.
- [x] Verifica E2E con reduced motion.
- [x] Funzionamento offline della shell e dei contenuti iniziali.

### Release

- [x] Definire versionamento semantico e changelog.
- [x] Bloccare il deploy se test, schema o asset check falliscono.
- [x] Generare artifact statico `dist/` contenente soltanto file necessari.
- [ ] Creare il tag Git dopo l'approvazione del worktree; backup demo release già creato.
- [x] Documentare problemi noti e procedura di rollback.

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
