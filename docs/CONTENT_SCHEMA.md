# Content schema

Questo documento descrive il formato JSON versione 2 usato dal tool.

## Documento radice

```json
{
  "schemaVersion": 2,
  "title": "TRIVIA CHALLENGE",
  "subtitle": "ANIME EDITION",
  "players": [],
  "games": [],
  "library": [],
  "powers": [],
  "history": [],
  "session": {
    "games": {}
  }
}
```

`games` contiene esclusivamente configurazione e contenuti. Gli esiti della partita, le domande usate e i bonus assegnati vengono conservati separatamente in `session.games`, indicizzati per ID del minigioco.

I documenti senza `schemaVersion` vengono migrati automaticamente. Un documento con una versione futura non supportata viene rifiutato senza sovrascrivere lo stato corrente.

Ogni minigioco ha sempre questi campi base:

```json
{
  "id": "game-...",
  "type": "guess",
  "title": "Titolo del minigioco"
}
```

## Tipi supportati

| Type | Minigioco |
|---|---|
| `guess` | Indovina il personaggio |
| `bomb` | Schiva la Bomba |
| `said` | Chi l'ha detto |
| `detail` | Occhio al dettaglio |
| `quote` | Completa la Frase |
| `chain` | Reazione a catena |
| `labors` | Le Dieci Fatiche |
| `guillotine` | Ghigliottina |
| `pass` | Passaparola |
| `jeopardy` | Jeopardy |
| `sarabanda` | Sarabanda |

## Media

I file media devono essere percorsi locali relativi sotto `public/assets/`.

Esempi:

```json
"public/assets/personaggio-1.jpg"
```

URL remoti, `data:` URL e percorsi contenenti `../` non sono accettati. Il file deve essere incluso nel progetto prima della partita.

Campi interessati: `image`, `audio`, `media`, `detailImage`, `fullImage`, `src` e `art`.

## Indovina il personaggio

```json
{
  "type": "guess",
  "title": "Indovina il personaggio",
  "rounds": [
    {
      "answer": "Nome personaggio",
      "clues": [
        {
          "label": "1000",
          "image": "public/assets/1.jpg",
          "fit": "cover",
          "positionX": 50,
          "positionY": 50,
          "zoom": 1
        },
        { "label": "500", "image": "public/assets/2.jpg" },
        { "label": "250", "image": "public/assets/3.jpg" },
        { "label": "50", "image": "public/assets/4.jpg" }
      ],
      "points": [1000, 500, 250, 50]
    }
  ]
}
```

Per ogni indizio `fit`, `positionX`, `positionY` e `zoom` sono opzionali. `fit` accetta `cover`, `contain` o `fill`; `positionX` e `positionY` vanno da 0 a 100; `zoom` va da 1 a 3.

## Schiva la Bomba

```json
{
  "type": "bomb",
  "title": "Schiva la Bomba",
  "question": "Quali elementi appartengono a...?",
  "pointsPerCorrect": 50,
  "items": [
    { "label": "Elemento corretto", "image": "", "isBomb": false },
    { "label": "Intruso", "image": "", "isBomb": true }
  ]
}
```

## Chi l'ha detto

```json
{
  "type": "said",
  "title": "Chi l'ha detto",
  "points": 100,
  "questions": [
    {
      "prompt": "Ascolta e indovina",
      "audio": "public/assets/frase.mp3",
      "answer": "Personaggio",
      "media": "public/assets/personaggio.jpg"
    }
  ]
}
```

## Occhio al dettaglio

```json
{
  "type": "detail",
  "title": "Occhio al dettaglio",
  "points": 200,
  "questions": [
    {
      "detailImage": "public/assets/dettaglio.jpg",
      "fullImage": "public/assets/scena.jpg",
      "answer": "Scena corretta"
    }
  ]
}
```

## Completa la Frase

```json
{
  "type": "quote",
  "title": "Completa la Frase",
  "points": 200,
  "questions": [
    {
      "partial": "Citazione parziale...",
      "answer": "Completamento perfetto",
      "source": "Opera di riferimento"
    }
  ]
}
```

## Reazione a catena

```json
{
  "type": "chain",
  "title": "Reazione a catena",
  "topic": "Argomento",
  "points": 50,
  "questions": [
    { "question": "Domanda 1", "answer": "Risposta 1" }
  ]
}
```

## Le Dieci Fatiche

```json
{
  "type": "labors",
  "title": "Le Dieci Fatiche",
  "points": 100,
  "questions": [
    {
      "kind": "risposta multipla",
      "question": "Domanda",
      "options": ["A", "B", "C", "D"],
      "answer": "Risposta corretta",
      "explanation": "Spiegazione opzionale"
    }
  ]
}
```

## Ghigliottina

```json
{
  "type": "guillotine",
  "title": "Ghigliottina",
  "points": 200,
  "words": ["parola 1", "parola 2", "parola 3", "parola 4", "parola 5"],
  "answer": "Risposta"
}
```

## Passaparola

```json
{
  "type": "pass",
  "title": "Passaparola",
  "difficulty": "facile",
  "points": { "facile": 5, "medio": 10, "difficile": 20 },
  "bonus": { "facile": 200, "medio": 500, "difficile": 1000 },
  "questions": [
    { "letter": "A", "question": "Con la A...", "answer": "Risposta" }
  ]
}
```

Lo stato `pending`, `correct`, `wrong` o `pass` è runtime e viene salvato in `session.games`, non nel contenuto della domanda.

## Jeopardy

```json
{
  "type": "jeopardy",
  "title": "Jeopardy",
  "categories": [
    {
      "name": "Categoria",
      "clues": [
        { "value": 100, "question": "Domanda", "answer": "Risposta", "used": false }
      ]
    }
  ]
}
```

## Sarabanda

```json
{
  "type": "sarabanda",
  "title": "Sarabanda",
  "pointsTitle": 25,
  "pointsArtist": 25,
  "songs": [
    { "audio": "public/assets/canzone.mp3", "title": "Titolo", "artist": "Artista" }
  ]
}
```
