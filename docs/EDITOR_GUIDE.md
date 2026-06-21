# Guida editor

L'editor visuale e il JSON avanzato sono sincronizzati finché il JSON non viene modificato manualmente. In caso di divergenza viene mostrato un avviso e il salvataggio richiede conferma. “Salva e prova” apre immediatamente il minigioco modificato.

I campi media accettano soltanto percorsi sotto `public/assets/`, mostrano anteprime locali e segnalano file mancanti o formati non supportati. Le domande possono essere riordinate, duplicate o eliminate.

## Asset locali

1. Copia immagini, audio o video sotto `public/assets/`.
2. Esegui `npm run assets:manifest`.
3. Seleziona il percorso suggerito nei campi media dell'Admin.

URL remoti, `data:` URL e percorsi fuori da `public/assets/` vengono rifiutati.

## Contenuti

- Usa i form visuali per le modifiche ordinarie.
- Il JSON avanzato è destinato a modifiche strutturali e import controllati.
- Esporta sempre un backup prima di interventi estesi.
- Gli esiti della partita sono in `session` e non modificano domande e risposte.

## Controlli di qualità

```bash
npm run release:check
```

Il comando verifica sintassi, lint, schema, manifest, asset, test unitari, browser e funzionamento offline.
