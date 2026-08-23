const GUESS_POINTS = [1000, 500, 250, 50];

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function answerValues(primary, accepted = []) {
  const values = [
    ...(Array.isArray(primary) ? primary : String(primary || '').split('|')),
    ...(Array.isArray(accepted) ? accepted : [])
  ];
  const seen = new Set();
  return values
    .map(value => String(value || '').trim())
    .filter(value => {
      const key = value.toLocaleLowerCase('it');
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function rules(primary, accepted, points) {
  return answerValues(primary, accepted).map(value => ({
    answer: value,
    points: Math.max(0, Math.round(number(points)))
  }));
}

function waiting(gameTitle = '', prompt = 'In attesa della prossima domanda…') {
  return {
    gameTitle,
    questionKey: '',
    questionType: '',
    prompt,
    points: 0,
    revealStep: 0,
    accepting: false,
    answerRules: []
  };
}

export function audienceQuestionState(game, navigation = {}, active = true) {
  if (!game || !active) return waiting(game?.title || '');
  const index = Math.max(0, number(navigation.i));
  const isOpen = !navigation.answer;
  const baseKey = `${game.id}:${game.type}`;

  if (game.type === 'guess') {
    const round = game.rounds?.[index];
    if (!round) return waiting(game.title);
    const clues = round.clues || [];
    const step = Math.min(Math.max(0, number(navigation.revealed)), clues.length);
    const points = number(
      round.points?.[step - 1] ?? clues[step - 1]?.label,
      GUESS_POINTS[step - 1] || 0
    );
    return {
      gameTitle: game.title,
      questionKey: `${baseKey}:round:${index}`,
      questionType: 'guess',
      prompt: step
        ? `Indovina il personaggio · immagine ${step} di ${clues.length}`
        : 'Attendi che venga rivelata la prima immagine.',
      points,
      revealStep: step,
      accepting: isOpen && step > 0,
      answerRules: rules(round.answer, round.acceptedAnswers, points)
    };
  }

  if (game.type === 'bomb') {
    const points = number(game.pointsPerCorrect, 50);
    const accepted = (game.items || [])
      .filter(item => !item.isBomb)
      .flatMap(item => answerValues(item.label, item.acceptedAnswers));
    return {
      gameTitle: game.title,
      questionKey: `${baseKey}:board`,
      questionType: 'bomb',
      prompt: game.question || 'Scrivi uno degli elementi corretti evitando le bombe.',
      points,
      revealStep: 1,
      accepting: isOpen,
      answerRules: rules(accepted, [], points)
    };
  }

  if (game.type === 'guillotine') {
    const revealed = Math.max(0, number(navigation.revealed));
    const points = Math.max(50, number(game.points, 200) - Math.max(0, revealed - 1) * 25);
    const visibleWords = (game.words || []).slice(0, revealed);
    return {
      gameTitle: game.title,
      questionKey: `${baseKey}:final`,
      questionType: 'guillotine',
      prompt: visibleWords.length
        ? `Trova la parola collegata: ${visibleWords.join(' · ')}`
        : 'Attendi il primo indizio.',
      points,
      revealStep: 1,
      accepting: isOpen && visibleWords.length > 0,
      answerRules: rules(game.answer, game.acceptedAnswers, points)
    };
  }

  if (game.type === 'jeopardy') {
    const selected = navigation.jeo;
    const category = selected ? game.categories?.[selected.c] : null;
    const clue = selected ? category?.clues?.[selected.q] : null;
    if (!clue) return waiting(game.title, 'In attesa che l’host apra una casella.');
    const points = number(clue.value);
    return {
      gameTitle: game.title,
      questionKey: `${baseKey}:clue:${selected.c}:${selected.q}`,
      questionType: 'jeopardy',
      prompt: `${category.name} · ${points} punti\n${clue.question}`,
      points,
      revealStep: 1,
      accepting: isOpen,
      answerRules: rules(clue.answer, clue.acceptedAnswers, points)
    };
  }

  if (game.type === 'sarabanda') {
    const song = game.songs?.[index];
    if (!song) return waiting(game.title);
    const titlePoints = number(game.pointsTitle, 25);
    const artistPoints = number(game.pointsArtist, 25);
    const combined = `${song.title || ''} - ${song.artist || ''}`;
    return {
      gameTitle: game.title,
      questionKey: `${baseKey}:song:${index}`,
      questionType: 'sarabanda',
      prompt: `Brano ${index + 1}: scrivi “titolo - artista” per il punteggio pieno.`,
      points: titlePoints + artistPoints,
      revealStep: 1,
      accepting: isOpen,
      answerRules: [
        ...rules(song.title, song.acceptedTitles, titlePoints),
        ...rules(song.artist, song.acceptedArtists, artistPoints),
        ...rules(combined, song.acceptedAnswers, titlePoints + artistPoints)
      ]
    };
  }

  const question = game.questions?.[index];
  if (!question) return waiting(game.title);
  const definitions = {
    said: {
      prompt: question.prompt || 'Chi ha pronunciato questa frase?',
      points: number(game.points, 100)
    },
    detail: {
      prompt: question.prompt || 'Che cosa mostra questo dettaglio?',
      points: number(game.points, 200)
    },
    quote: {
      prompt: question.partial || 'Completa la frase.',
      points: number(game.points, 200)
    },
    chain: {
      prompt: question.question,
      points: number(game.points, 50)
    },
    labors: {
      prompt: question.question,
      points: number(game.points, 100),
      enabled: Boolean(navigation.laborOpen)
    },
    pass: {
      prompt: question.question,
      points: number(game.points?.[game.difficulty || 'facile'], 5)
    }
  };
  const definition = definitions[game.type];
  if (!definition) return waiting(game.title, 'Questo minigioco non supporta ancora risposte spettatore.');

  return {
    gameTitle: game.title,
    questionKey: `${baseKey}:question:${index}`,
    questionType: game.type,
    prompt: definition.prompt || `Domanda ${index + 1}`,
    points: definition.points,
    revealStep: 1,
    accepting: isOpen && definition.enabled !== false,
    answerRules: rules(question.answer, question.acceptedAnswers, definition.points)
  };
}
