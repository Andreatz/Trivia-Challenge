# Problemi noti

- I browser applicano regole proprie all'autoplay: audio e video possono richiedere il primo gesto dell'host.
- Alcuni codec proprietari non sono supportati; per i video usare WebM o MP4 compatibile, per l'audio WAV, MP3 oppure OGG.
- Le immagini di riferimento non sono incluse nella partita demo e non devono essere selezionate come media di gioco.
- Il progetto resta una SPA statica locale: non sincronizza sessioni tra dispositivi.
- La conversione WebP è applicata soltanto alle fotografie demo verificate; gli altri PNG vengono mantenuti quando natura grafica o trasparenza non sono state ancora escluse automaticamente.

Gli errori di caricamento media sono mostrati nella schermata e i campi dell'editor verificano percorso, formato e presenza nel manifest.
