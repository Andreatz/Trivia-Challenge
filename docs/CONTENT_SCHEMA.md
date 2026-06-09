# Content schema

Questo documento descrive il formato JSON usato dal tool.

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

I file media possono essere percorsi locali nella repo o URL esterni.

Esempi:

```json
"public/assets/personaggio-1.jpg"
```

```json
"https://example.com/immagine.jpg"
```

## Indovina il personaggio

```json
{
  "type": "guess",
  "title": "Indovina il personaggio",
  "rounds": [
    {
      "answer": "Nome personaggio",
      "clues": [
        "public/assets/1.jpg",
        "public/assets/2.jpg",
        "public/assets/3.jpg",
        "public/assets/4.jpg"
      ],
      "points": [1000, 500, 250, 50]
    }
  ]
}
```

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
  "points": { "facile": 5, "medio": 5, "difficile": 20 },
  "bonus": { "facile": 200, "medio": 500, "difficile": 1000 },
  "questions": [
    { "letter": "A", "question": "Con la A...", "answer": "Risposta", "status": "pending" }
  ]
}
```

`status` può essere `pending`, `correct`, `wrong`, `pass`.

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
