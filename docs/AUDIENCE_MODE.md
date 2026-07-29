# Modalità spettatore

La modalità spettatore aggiunge due pagine pubbliche:

- `spectator.html`: ingresso con codice stanza e nickname univoco, risposta da telefono e punteggio personale;
- `leaderboard.html`: classifica live contenente esclusivamente gli spettatori.

L’host gestisce la stanza dalla voce **Spettatori** dell’app principale. Domanda, apertura/chiusura delle risposte e indizio corrente vengono sincronizzati automaticamente dalla modalità Show.

## Configurazione Supabase

1. Crea o scegli un progetto Supabase.
2. Applica la migrazione in `supabase/migrations/*_audience_mode.sql`.

   Con la CLI:

   ```bash
   supabase link --project-ref IL_PROJECT_REF
   supabase db push
   ```

3. Nel dashboard Realtime:

   - abilita Realtime;
   - consenti i canali pubblici, usati soltanto per lo stato pubblico della domanda;
   - imposta **Max concurrent clients** e **Max events per second** in base al pubblico atteso.

4. Copia Project URL e **Publishable key** in `src/audience-config.js`:

   ```js
   export const AUDIENCE_CONFIG = Object.freeze({
     supabaseUrl: 'https://PROJECT_REF.supabase.co',
     publishableKey: 'sb_publishable_...'
   });
   ```

   La Publishable key è prevista per il browser. Non inserire mai una Secret key o la vecchia `service_role`.

5. Esegui `npm run build` e distribuisci l’intero contenuto di `dist/`.

## Flusso durante la partita

1. Apri **Spettatori** e premi **Crea stanza spettatori**.
2. Mostra al pubblico il QR code o il codice di 6 caratteri.
3. Torna in **Show** e conduci la partita normalmente.
4. Apri **Classifica live** su un secondo schermo quando serve.
5. A fine partita premi **Termina sessione**: i telefoni passano alla classifica finale.

Per **Indovina il personaggio**:

- nessuna risposta è accettata prima della prima immagine;
- ogni immagine rivelata abilita un nuovo tentativo per chi ha sbagliato;
- il punteggio è quello dell’immagine corrente (1000, 500, 250, 50 o il valore configurato);
- dopo una risposta corretta non sono ammessi altri tentativi sullo stesso personaggio.

Per aggiungere più risposte equivalenti, separale con `|` nel campo risposta, per esempio:

```text
Sosuke Aizen|Aizen|Sōsuke Aizen
```

## Architettura e capacità

- Le soluzioni e i token sono conservati come dati privati; le tabelle hanno RLS attiva e non sono leggibili direttamente dal client.
- Valutazione, blocco dei tentativi e accredito punti avvengono atomicamente in Postgres.
- Il nickname è univoco nella stanza senza distinzione tra maiuscole e minuscole.
- I telefoni ricevono via Realtime Broadcast soltanto i cambi di domanda/indizio. Le singole risposte non generano un broadcast globale, evitando un effetto quadratico durante i picchi.
- La pagina classifica interroga una funzione aggregata ogni 2,5 secondi e può restituire fino a 5.000 spettatori.

Per oltre 1.000 connessioni simultanee il piano Free (200) e il Pro con spend cap (500) non sono sufficienti. Al momento della configurazione va scelto un piano/quota da almeno 1.000 connessioni e va eseguito un test di carico realistico sulla regione di produzione.

## Verifica locale

Avvia Supabase e l’app:

```bash
supabase start
npm run dev
```

Inserisci temporaneamente in `src/audience-config.js` l’URL e la Publishable key mostrati da `supabase status`.

Test backend:

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
npm run test:audience:integration
```

Test browser multi-dispositivo:

```bash
npx playwright test e2e/audience.spec.js --project=chromium-720p
```

