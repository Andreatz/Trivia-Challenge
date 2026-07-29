# Modalità spettatore

La modalità spettatore usa due servizi con responsabilità separate:

- **Supabase** conserva stanze, nickname, tentativi e punteggi tramite RPC HTTP;
- **Cloudflare Workers + Durable Objects** invia in tempo reale domanda e immagine corrente ai telefoni.

Non vengono aperte connessioni Supabase Realtime. Il limite di 200 connessioni del piano
Supabase Free non si applica quindi agli spettatori.

Le pagine pubbliche sono:

- `spectator.html`: ingresso tramite QR/codice, nickname univoco e risposta da telefono;
- `leaderboard.html`: classifica live contenente esclusivamente gli spettatori.

## 1. Configurazione Supabase

Creare un progetto Supabase dedicato a Trivia Challenge. Non riutilizzare il database di
un'altra applicazione.

```powershell
npx supabase login
npx supabase link --project-ref IL_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Devono essere applicate tutte le migrazioni:

- `20260729163247_audience_mode.sql`;
- `20260729210709_audience_cloudflare_relay.sql`;
- `20260729230008_audience_admin_auth.sql`.

La seconda migrazione rimuove il Broadcast Supabase e aggiunge l'RPC privata usata dal
relay per leggere soltanto lo stato pubblico verificato. Non è necessario abilitare
Realtime nel dashboard Supabase.

La terza migrazione autorizza un solo UUID Supabase come Admin. La pagina principale
richiede email e password; spettatori e giocatori non devono creare account.

Recuperare dal dashboard:

- Project URL, per esempio `https://PROJECT_REF.supabase.co`;
- **Publishable key**, per esempio `sb_publishable_...`.

Non usare mai nel browser o nel Worker una Secret key o una `service_role` key.

## 2. Distribuzione del relay Cloudflare

Il Worker si trova in `cloudflare/audience-relay/` e usa un Durable Object SQLite con
WebSocket Hibernation.

```powershell
npx wrangler login
npm run relay:check
npm run relay:deploy
```

Dopo il primo deploy, configurare nel Worker quattro variabili. È possibile farlo da
**Cloudflare Dashboard → Workers & Pages → trivia-audience-relay → Settings → Variables
and Secrets**, oppure con `wrangler secret put`:

```powershell
npx wrangler secret put SUPABASE_URL --config cloudflare/audience-relay/wrangler.jsonc
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY --config cloudflare/audience-relay/wrangler.jsonc
npx wrangler secret put RELAY_SIGNING_SECRET --config cloudflare/audience-relay/wrangler.jsonc
```

Valori:

- `SUPABASE_URL`: Project URL Supabase;
- `SUPABASE_PUBLISHABLE_KEY`: Publishable key Supabase;
- `ALLOWED_ORIGINS`: origine HTTPS pubblica dell'app, senza slash finale. Non è un
  segreto e viene configurata in `wrangler.jsonc`; più origini vanno separate da virgola;
- `RELAY_SIGNING_SECRET`: almeno 32 caratteri casuali. Non inserirlo nel frontend.

Per generare il segreto:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Verificare il Worker:

```powershell
Invoke-RestMethod https://NOME_WORKER.SUBDOMAIN.workers.dev/health
```

La risposta deve contenere:

```json
{"ok":true,"configured":true}
```

## 3. Configurazione del frontend

Aggiornare `src/audience-config.js`:

```js
export const AUDIENCE_CONFIG = Object.freeze({
  supabaseUrl: 'https://PROJECT_REF.supabase.co',
  publishableKey: 'sb_publishable_...',
  relayUrl: 'https://trivia-audience-relay.SUBDOMAIN.workers.dev'
});
```

Il CSP incluso accetta i domini `*.workers.dev`. Se viene usato un dominio Cloudflare
personalizzato, aggiungerlo a `connect-src` in `index.html` e `spectator.html`.

Eseguire infine:

```powershell
npm run build
```

e distribuire l'intero contenuto di `dist/` su hosting HTTPS.

## Protocollo e sicurezza

1. Lo spettatore entra con il solo nickname e riceve un token casuale, senza account.
2. Prima di aprire il WebSocket, il Worker verifica quel token con Supabase.
3. Il Worker restituisce un ticket HMAC valido per 60 secondi.
4. Il telefono apre il WebSocket usando il ticket; il token Supabase non compare nell'URL.
5. L'host salva lo stato in Supabase.
6. Il Worker verifica il segreto host, legge la sola copia pubblica e la distribuisce.

Ogni partecipante può mantenere una sola connessione attiva: una riconnessione valida
sostituisce automaticamente il socket precedente.

Le risposte corrette non attraversano Cloudflare. Se il relay è temporaneamente
irraggiungibile, lo stato resta salvato in Supabase e i telefoni usano un polling HTTP
lento con jitter fino alla riconnessione.

## Flusso durante la partita

1. Aprire **Spettatori** e premere **Crea stanza spettatori**.
2. Mostrare il QR code o il codice di sei caratteri.
3. Tornare in **Show** e condurre la partita normalmente.
4. Aprire **Classifica live** su un secondo schermo quando serve.
5. Premere **Termina sessione**: i telefoni ricevono lo stato finale e mostrano il link
   alla classifica.

Per **Indovina il personaggio**:

- nessuna risposta è accettata prima della prima immagine;
- ogni immagine rivelata abilita un nuovo tentativo per chi ha sbagliato;
- il punteggio standard è 1000, 500, 250 e 50;
- dopo una risposta corretta non sono ammessi altri tentativi sullo stesso personaggio.

Risposte equivalenti possono essere separate con `|`, per esempio:

```text
Sosuke Aizen|Aizen|Sōsuke Aizen
```

## Capacità

Un Durable Object supporta migliaia di WebSocket ibernabili. Per 30 personaggi con
quattro immagini vengono pubblicati circa 120 eventi host; i messaggi WebSocket in
uscita non consumano request Cloudflare.

Il test incluso ha verificato localmente:

- 1.000 WebSocket simultanei;
- 1.000 consegne su 1.000 per un cambio immagine;
- riconnessione del telefono e recupero immediato dello stato corrente;
- nessuna connessione verso Supabase Realtime.

Il database può ricevere al massimo quattro tentativi per personaggio: 120.000 tentativi
nel caso limite di 1.000 spettatori. Prima dell'evento va comunque eseguito un test
realistico dalla regione di produzione.

Limiti ufficiali:

- <https://developers.cloudflare.com/durable-objects/platform/pricing/>
- <https://developers.cloudflare.com/durable-objects/api/state/>

## Verifica locale

Copiare l'esempio delle variabili del relay:

```powershell
Copy-Item cloudflare/audience-relay/.dev.vars.example cloudflare/audience-relay/.dev.vars
```

Inserire nella copia i valori restituiti da `npx supabase status`, quindi usare tre
terminali:

```powershell
npx supabase start
npm run dev
npm run relay:dev
```

Test backend:

```powershell
$env:SUPABASE_URL = "http://127.0.0.1:54321"
$env:SUPABASE_PUBLISHABLE_KEY = "sb_publishable_..."
$env:AUDIENCE_ADMIN_EMAIL = "admin@example.com"
$env:AUDIENCE_ADMIN_PASSWORD = "password-locale"
npm run test:audience:integration
```

Test di carico:

```powershell
$env:AUDIENCE_RELAY_URL = "http://127.0.0.1:8787"
$env:AUDIENCE_APP_ORIGIN = "http://127.0.0.1:5173"
$env:CLIENTS = "1000"
$env:AUDIENCE_ADMIN_EMAIL = "admin@example.com"
$env:AUDIENCE_ADMIN_PASSWORD = "password-locale"
npm run test:audience:load
```

Test browser multi-dispositivo:

```powershell
$env:AUDIENCE_ADMIN_EMAIL = "admin@example.com"
$env:AUDIENCE_ADMIN_PASSWORD = "password-locale"
npx playwright test e2e/audience.spec.js --project=chromium-720p
```
