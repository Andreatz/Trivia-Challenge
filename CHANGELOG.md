# Changelog

Il progetto segue [Semantic Versioning](https://semver.org/lang/it/).

## [Non rilasciato] — 2026-06-21

### Aggiunto

- Schema dati v3 con sezioni `content`, `session`, `settings` e `history` e migrazione automatica da v1/v2.
- Undo editoriale limitato a 20 snapshot dei soli contenuti e undo punteggio indipendente.
- Export e backup locale prima di import, nuova partita e cancellazione dello storico.
- Demo locale deterministica degli 11 minigiochi, verificata dal release gate.
- Pointer capture per tutti i trascinamenti dell'editor visuale.
- Contratto comune `normalize`, `render`, `reset`, `getResult` per gli 11 minigiochi.
- Ripristino della schermata, del gioco, della domanda e dei reveal dopo un refresh accidentale.
- Scorciatoie host, pannello di aiuto accessibile e avvisi timer visivi/sonori disattivabili.
- Validazione inline, anteprime locali, riordino/duplicazione domande e flusso “Salva e prova” nell'editor.
- Pipeline locale per thumbnail WebP, migrazioni dei percorsi asset e archivio degli originali.
- Guide host/editor, policy asset, problemi noti e procedura di rollback.

### Modificato

- Pannelli punteggio e timer non ricreano più i player multimediali.
- Giocatore attivo e pannello punti rapidi sono ora stati distinti, evitando assegnazioni perse alla chiusura del pannello.
- La demo usa esclusivamente media locali validati e include un audio WAV locale.
- Il gate di release copre 42 test unitari e 66 test E2E superati.

## [0.1.0] — 2026-06-20

### Aggiunto

- Motore punteggi ed esiti per gli 11 minigiochi.
- Schema dati v2, migrazioni, backup e sessione separata dai contenuti.
- Timer condiviso, controlli media e modalità host/pubblico.
- Manifest e audit degli asset esclusivamente locali.
- PWA offline con cache progressiva.
- Test Vitest e Playwright su 720p e 1080p.
- Release gate CI con lint, schema, asset check, unit test ed E2E.

### Modificato

- Ottimizzati in modo lossless 108 PNG, senza cambiare percorsi o pixel.
- Allineati README, schema contenuti e comportamento fullscreen.

### Note

- Versione di stabilizzazione pre-1.0.
- Il renderer e parte del CSS restano monolitici e saranno rifattorizzati incrementalmente.
