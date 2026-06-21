# Politica degli asset locali

- I media pubblicati vivono in `public/assets/<gioco-o-evento>/` con cartelle e nuovi nomi in minuscolo, kebab-case e senza spazi.
- Le anteprime derivate vivono in `public/thumbnails/` e sono rigenerabili; non sono fonti originali.
- Screenshot e riferimenti di progettazione restano in `public/reference-images/` e non vanno usati come contenuti di gioco.
- Gli originali di lavorazione, quando disponibili, vanno conservati in `archive/assets-originals/`, escluso dall'artefatto statico.
- `public/assets-migrations.json` registra i rinomini compatibili applicati in lettura ai vecchi contenuti.
- Nessun URL remoto è ammesso. Licenze e provenienza sono documentate in `public/ATTRIBUTION.md`.

Comandi: `npm run assets:check`, `npm run thumbnails:generate` e `npm run thumbnails:check`.
