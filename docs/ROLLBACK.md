# Procedura di rollback

1. Esportare la sessione corrente dall'Admin e conservare `trivia-challenge-v3` dal localStorage se serve un recupero forense.
2. Conservare `public/demo/trivia-challenge-demo.json` e il backup della release in `release/`.
3. Ripristinare l'ultimo commit o artefatto statico noto come stabile.
4. Pubblicare nuovamente la cartella `dist/` della versione precedente.
5. Al primo avvio attendere l'avviso PWA e ricaricare: il service worker elimina le cache con versione diversa.
6. Reimportare il JSON esportato. Le migrazioni v1/v2 verso v3 restano supportate; una versione futura viene rifiutata.

Prima del rilascio eseguire `npm run release:check` e `npm run build`. Se uno dei due fallisce, non aggiornare il tag di release.
