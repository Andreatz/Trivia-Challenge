export const GAME_DEFINITIONS = Object.freeze({
  guess: { label: 'Indovina il personaggio', menuOrder: 0 },
  clues: { label: 'Indovina il personaggio: Indizi', menuOrder: 0.5 },
  geoguessr: { label: 'Geoguessr', menuOrder: 0.75 },
  bomb: { label: 'Schiva la Bomba', menuOrder: 1 },
  jeopardy: { label: 'Jeopardy', menuOrder: 2 },
  pass: { label: 'Passaparola', menuOrder: 3 },
  said: { label: "Chi l'ha detto", menuOrder: 4 },
  detail: { label: 'Occhio al dettaglio', menuOrder: 5 },
  quote: { label: 'Completa la Frase', menuOrder: 6 },
  chain: { label: 'Reazione a catena', menuOrder: 7 },
  labors: { label: 'Le Dieci Fatiche', menuOrder: 8 },
  guillotine: { label: 'Ghigliottina', menuOrder: 9 },
  sarabanda: { label: 'Sarabanda', menuOrder: 10 }
});

export const GAME_TYPES = new Set(Object.keys(GAME_DEFINITIONS));
export const GAME_LABELS = Object.fromEntries(Object.entries(GAME_DEFINITIONS).map(([type, definition]) => [type, definition.label]));
export const MENU_ORDER = Object.entries(GAME_DEFINITIONS)
  .sort(([, left], [, right]) => left.menuOrder - right.menuOrder)
  .map(([type]) => type);

const CATEGORY_ICONS = Object.freeze({ Anime: '✦', Cinema: '▣', 'Serie TV': '▢', Musica: '♫', Gaming: '☍' });

export function categoryIcon(name) {
  return CATEGORY_ICONS[name] || '✦';
}

export function createGameTemplates({ createId, alphabet }) {
  return {
    guess: () => ({ id: createId('game'), type: 'guess', title: 'Indovina il personaggio', menuTitle: 'INDOVINA IL PERSONAGGIO', rounds: [{ answer: 'Aizen', points: [1000, 500, 250, 50], clues: [{ label: '1000', image: 'public/assets/indovina-il-personaggio/anime/aizen-1.webp' }, { label: '500', image: 'public/assets/indovina-il-personaggio/anime/aizen-2.webp' }, { label: '250', image: 'public/assets/indovina-il-personaggio/anime/aizen-3.webp' }, { label: '50', image: 'public/assets/indovina-il-personaggio/anime/aizen-4.webp' }] }] }),
    clues: () => ({ id: createId('game'), type: 'clues', title: 'Indovina il personaggio: Indizi', menuTitle: 'INDOVINA IL PERSONAGGIO: INDIZI', questions: [{ answer: 'Nome personaggio', acceptedAnswers: [], clues: Array.from({ length: 10 }, (_, index) => `Indizio ${index + 1}`), points: [1000, 900, 750, 600, 400, 200, 100, 50, 20, 10] }] }),
    geoguessr: () => ({ id: createId('game'), type: 'geoguessr', title: 'Geoguessr', menuTitle: 'GEOGUESSR', points: 300, questions: [{ prompt: 'Su quale pianeta si trova questo luogo?', image: '', answer: 'Pianeta' }] }),
    bomb: () => ({ id: createId('game'), type: 'bomb', title: 'Schiva la Bomba', menuTitle: 'SCHIVA LA BOMBA!', question: 'Trova i 16 elementi collegati alla domanda ed evita le 4 bombe.', pointsPerCorrect: 50, items: Array.from({ length: 20 }, (_, index) => ({ label: `Elemento ${index + 1}`, image: index === 0 ? 'public/assets/schiva-la-bomba/Gilgamesh.png' : index === 1 ? 'public/assets/schiva-la-bomba/92d1690b591d42988322de6699e97474_1611356315530.png' : '', isBomb: index >= 16 })) }),
    said: () => ({ id: createId('game'), type: 'said', title: "Chi l'ha detto", menuTitle: "CHI L'HA DETTO", points: 100, questions: [{ prompt: "Ascolta l'audio e indovina il personaggio.", audio: 'public/assets/audio/demo-tone.wav', answer: 'Aizen', media: 'public/assets/indovina-il-personaggio/anime/aizen-1.webp' }] }),
    detail: () => ({ id: createId('game'), type: 'detail', title: 'Occhio al dettaglio', menuTitle: 'OCCHIO AL DETTAGLIO', points: 200, questions: [{ detailImage: 'public/assets/indovina-il-personaggio/anime/aizen-2.webp', fullImage: 'public/assets/indovina-il-personaggio/anime/aizen-3.webp', answer: 'Aizen' }] }),
    quote: () => ({ id: createId('game'), type: 'quote', title: 'Completa la Frase', menuTitle: 'COMPLETA LA FRASE', points: 200, questions: [{ partial: 'Io sono tuo...', answer: 'padre', source: 'Star Wars' }] }),
    chain: () => ({ id: createId('game'), type: 'chain', title: 'Reazione a catena', menuTitle: 'REAZIONE A CATENA', topic: 'Argomento', points: 50, questions: Array.from({ length: 20 }, (_, index) => ({ question: `Domanda sequenziale ${index + 1}`, answer: `Risposta ${index + 1}` })) }),
    labors: () => ({ id: createId('game'), type: 'labors', title: 'Le Dieci Fatiche', menuTitle: 'LE DIECI FATICHE', points: 100, questions: Array.from({ length: 10 }, (_, index) => ({ kind: ['risposta secca', 'risposta multipla', 'elenco', 'spiegazione'][index % 4], question: `Fatica ${index + 1}`, options: index % 4 === 1 ? ['A', 'B', 'C', 'D'] : [], answer: `Risposta ${index + 1}`, explanation: 'Spiegazione opzionale.' })) }),
    guillotine: () => ({ id: createId('game'), type: 'guillotine', title: 'Ghigliottina', menuTitle: 'GHIGLIOTTINA', points: 200, words: ['parola 1', 'parola 2', 'parola 3', 'parola 4', 'parola 5'], answer: 'Risposta collegata' }),
    pass: () => ({ id: createId('game'), type: 'pass', title: 'Passaparola', menuTitle: 'PASSAPAROLA', difficulty: 'facile', points: { facile: 5, medio: 10, difficile: 20 }, bonus: { facile: 200, medio: 500, difficile: 1000 }, questions: alphabet.map(letter => ({ letter, question: `Con la ${letter}: domanda`, answer: `Risposta con ${letter}` })) }),
    jeopardy: () => ({ id: createId('game'), type: 'jeopardy', title: 'Jeopardy', menuTitle: 'JEOPARDY', categories: ['Anime', 'Cinema', 'Serie TV', 'Musica', 'Gaming'].map(name => ({ name, clues: [100, 200, 300, 400, 500].map(value => ({ value, question: `Domanda ${name} da ${value}`, answer: `Risposta ${name} ${value}` })) })) }),
    sarabanda: () => ({ id: createId('game'), type: 'sarabanda', title: 'Sarabanda', menuTitle: 'SARABANDA', pointsTitle: 25, pointsArtist: 25, songs: [{ audio: 'public/assets/audio/demo-tone.wav', title: 'Tono demo', artist: 'Trivia Challenge' }] })
  };
}

export function createStarWarsGames() {
  const cluePoints = [1000, 900, 750, 600, 400, 200, 100, 50, 20, 10];
  const pixelRound = (slug, answer, acceptedAnswers = []) => ({
    answer,
    acceptedAnswers,
    points: [1000, 500, 250, 100],
    clues: [1000, 500, 250, 100].map((label, index) => ({
      label: String(label),
      image: `public/assets/star-wars/pixel/${slug}-${index + 1}.png`
    }))
  });
  const passQuestion = (letter, answer, question, acceptedAnswers = []) => ({ letter, answer, question, acceptedAnswers });
  const passQuestionSets = {
    facile: [
      passQuestion('A', 'Anakin', 'Il vero nome del Cavaliere Jedi che diventerà Darth Vader.', ['Anakin Skywalker']),
      passQuestion('B', 'Boba Fett', "Il leggendario cacciatore di taglie con l'armatura mandaloriana.", ['Boba']),
      passQuestion('C', 'C-3PO', 'Droide protocollare dorato che conosce più di sei milioni di forme di comunicazione.', ['C3PO', '3PO']),
      passQuestion('D', 'Droide', 'Nome generico per i robot come R2-D2 o BB-8.', ['Droid']),
      passQuestion('E', 'Ewok', 'Piccole creature pelose che abitano sulla luna boscosa di Endor.', ['Ewoks']),
      passQuestion('F', 'Forza', 'Il campo di energia che lega insieme tutta la galassia.', ['La Forza']),
      passQuestion('G', 'Galassia', 'Il luogo “lontano lontano” dove si svolgono tutte le avventure.'),
      passQuestion('H', 'Han Solo', 'Il contrabbandiere pilota del Millennium Falcon.', ['Han']),
      passQuestion('I', 'Impero', "L'organizzazione tirannica guidata dall'Imperatore Palpatine.", ['Impero Galattico']),
      passQuestion('L', 'Luke', "Il giovane contadino di Tatooine che diventa l'ultimo dei Jedi.", ['Luke Skywalker']),
      passQuestion('M', 'Millennium Falcon', 'La nave spaziale che ha fatto la rotta di Kessel in meno di dodici parsec.', ['Falcon', 'Millenium Falcon']),
      passQuestion('N', 'Naboo', "Il pianeta d'origine della regina Padmé Amidala."),
      passQuestion('O', 'Obi-Wan', 'Il maestro Jedi che veglia su Luke nel deserto.', ['Obi Wan', 'Obi-Wan Kenobi', 'Kenobi']),
      passQuestion('P', 'Padmé', 'La senatrice di Naboo e madre di Luke e Leia.', ['Padme', 'Padmé Amidala', 'Padme Amidala']),
      passQuestion('Q', 'Qui-Gon Jinn', 'Il maestro di Obi-Wan che scoprì Anakin Skywalker.', ['Qui-Gon', 'Qui Gon', 'Qui Gon Jinn']),
      passQuestion('R', 'R2-D2', 'Il piccolo droide astromeccanico bianco e blu.', ['R2D2', 'R2']),
      passQuestion('S', 'Spada laser', "L'arma dei Cavalieri Jedi.", ['Lightsaber']),
      passQuestion('T', 'Tatooine', 'Il pianeta desertico con due soli.'),
      passQuestion('U', 'Umani', 'La specie più diffusa nella galassia, a cui appartengono Han e Leia.', ['Umano']),
      passQuestion('V', 'Vader', "Il cognome Sith dell'oscuro signore vestito di nero.", ['Darth Vader'])
    ],
    medio: [
      passQuestion('A', 'Ackbar', 'L’Ammiraglio celebre per la frase “È una trappola!”.', ['Ammiraglio Ackbar', 'Admiral Ackbar']),
      passQuestion('B', 'Bespin', 'Il pianeta gassoso dove si trova la Città delle Nuvole.'),
      passQuestion('C', 'Coruscant', 'Il pianeta-capitale interamente ricoperto da una città.'),
      passQuestion('D', 'Dooku', 'Il Conte ex Jedi diventato apprendista di Darth Sidious.', ['Conte Dooku', 'Count Dooku']),
      passQuestion('E', 'Endor', 'La luna su cui viene distrutta la seconda Morte Nera.'),
      passQuestion('F', 'Finn', "L'ex assaltatore FN-2187 che si unisce alla Resistenza.", ['FN-2187', 'FN 2187']),
      passQuestion('G', 'Grievous', 'Il generale cyborg con quattro braccia che colleziona spade laser.', ['Generale Grievous', 'General Grievous']),
      passQuestion('H', 'Hoth', 'Il pianeta ghiacciato dove i ribelli hanno la base Echo.'),
      passQuestion('I', 'Inquisitori', "Cacciatori di Jedi che servono l'Impero dopo l'Ordine 66.", ['Inquisitore']),
      passQuestion('L', 'Lando', "Il nome del vecchio amico di Han ed ex proprietario del Falcon.", ['Lando Calrissian']),
      passQuestion('M', 'Mace Windu', 'Il potente maestro Jedi con la spada laser viola.', ['Mace']),
      passQuestion('N', 'Nuova Repubblica', "Il governo formato dopo la caduta dell'Impero."),
      passQuestion('O', 'Ordine 66', 'Il protocollo che portò allo sterminio quasi totale dei Jedi.', ['Order 66']),
      passQuestion('P', 'Palpatine', 'Il vero cognome di Darth Sidious.', ['Imperatore Palpatine', 'Darth Sidious', 'Sidious']),
      passQuestion('Q', 'Quarren', 'Specie aliena acquatica con tentacoli sul volto che abita il pianeta Mon Cala.'),
      passQuestion('R', 'Rey', 'La ragazza mercante di rottami che scopre di essere la nipote dell’Imperatore.', ['Rey Skywalker', 'Rey Palpatine']),
      passQuestion('S', 'Sith', 'Gli antichi nemici dei Jedi che utilizzano il Lato Oscuro.'),
      passQuestion('T', 'Tarkin', 'Il Grand Moff al comando della prima Morte Nera.', ['Grand Moff Tarkin', 'Wilhuff Tarkin']),
      passQuestion('U', 'Utapau', 'Il pianeta dai profondi crateri dove Obi-Wan affronta il Generale Grievous.'),
      passQuestion('V', 'Venator', 'Il nome della classe di navi da guerra utilizzate dalla Repubblica durante la Guerra dei Cloni.', ['Classe Venator'])
    ],
    difficile: [
      passQuestion('A', 'Ahsoka Tano', "La Padawan di Anakin Skywalker che ha lasciato l'Ordine Jedi.", ['Ahsoka']),
      passQuestion('B', 'Darth Bane', 'Il leggendario Sith che creò la Regola dei Due.', ['Bane']),
      passQuestion('C', 'Carbonite', 'La sostanza usata per congelare Han Solo su Bespin.', ['Carbonite']),
      passQuestion('D', 'Darth Plagueis', "Il maestro di Sidious che cercava il segreto dell'immortalità.", ['Plagueis']),
      passQuestion('E', 'Exegol', "Il pianeta nascosto dei Sith dove risorge l'Imperatore nell'Episodio IX."),
      passQuestion('F', 'Felucia', 'Il pianeta fungino dove viene uccisa la Maestra Jedi Aayla Secura.'),
      passQuestion('G', 'Geonosis', 'Il pianeta dove avviene la prima battaglia della Guerra dei Cloni.'),
      passQuestion('H', 'Holocron', 'Antico artefatto a forma di cubo o piramide che contiene conoscenze Jedi o Sith.'),
      passQuestion('I', 'Ilum', 'Il pianeta sacro dove i Jedi raccoglievano i cristalli Kyber per le loro spade.'),
      passQuestion('L', 'Lothal', "Il pianeta d'origine di Ezra Bridger, centrale nella serie Rebels."),
      passQuestion('M', 'Midichlorian', 'Forme di vita microscopiche che permettono di percepire la Forza.', ['Midi-chlorian', 'Midichlorian']),
      passQuestion('N', 'Darth Nihilus', 'Signore dei Sith noto come “Il Divoratore di Mondi”.', ['Nihilus']),
      passQuestion('O', 'Onderon', 'Il pianeta dove Saw Gerrera iniziò la sua ribellione.'),
      passQuestion('P', 'Poggle il Minore', "L'Arciduca geonosiano che collaborò alla costruzione della Morte Nera.", ['Poggle']),
      passQuestion('Q', 'Quermiano', 'La specie a cui appartiene il Maestro Jedi Yarael Poof.', ['Quermian']),
      passQuestion('R', 'Rakata', 'Antica specie che dominò la galassia millenni prima della Repubblica.'),
      passQuestion('S', 'Starkiller', 'Il nome della base del Primo Ordine ricavata da un intero pianeta.', ['Base Starkiller']),
      passQuestion('T', 'Thrawn', 'Il Grand’Ammiraglio Chiss, genio della strategia militare.', ['Thrawne', 'Grand Ammiraglio Thrawn', 'Grand Admiral Thrawn']),
      passQuestion('U', 'Umbara', "Il pianeta dell'eterna oscurità dove avviene una delle battaglie più dure dei Cloni."),
      passQuestion('V', 'Pre Vizsla', 'Il leader mandaloriano della Ronda della Morte che impugnava la Spada Oscura.', ['Vizsla', 'Vizsla Pre'])
    ]
  };
  return [
    {
      id: 'star-wars-pixel',
      type: 'guess',
      variant: 'pixel',
      title: 'Indovina il personaggio: Pixel',
      menuTitle: 'INDOVINA IL PERSONAGGIO: PIXEL',
      rounds: [
        pixelRound('qui-gon', 'Qui-Gon Jinn', ['Qui-Gon', 'Qui Gon', 'Maestro Qui-Gon']),
        pixelRound('yoda', 'Yoda', ['Maestro Yoda']),
        pixelRound('sabe', 'Sabé', ['Sabe']),
        pixelRound('cara-dune', 'Cara Dune', ['Cara', 'Carasynthia Dune']),
        pixelRound('rey', 'Rey', ['Rey Skywalker', 'Rey Palpatine']),
        pixelRound('palpatine', 'Palpatine', ['Darth Sidious', 'Sidious', 'Imperatore Palpatine', 'Imperatore']),
        pixelRound('boba-fett', 'Boba Fett', ['Boba']),
        pixelRound('general-merrick', 'Generale Merrick', ['General Merrick', 'Antoc Merrick', 'Merrick', 'Blue Leader']),
        pixelRound('c-3po', 'C-3PO', ['C3PO', '3PO']),
        pixelRound('galen-erso', 'Galen Erso', ['Galen'])
      ]
    },
    {
      id: 'star-wars-clues',
      type: 'clues',
      title: 'Indovina il personaggio: Indizi',
      menuTitle: 'INDOVINA IL PERSONAGGIO: INDIZI',
      questions: [
        { answer: 'Cassian Andor', acceptedAnswers: ['Cassian', 'Andor'], clues: ['26 BBY', 'Kenari', 'Maschio', 'Umano', 'Alleanza Ribelle', "Ufficiale d'intelligence", 'Jedha', 'Jyn Erso', 'Piani della Morte Nera', 'Scarif'], points: cluePoints },
        { answer: 'Mon Mothma', acceptedAnswers: ['Mothma'], clues: ['46 BBY', 'Chandrila', 'Femmina', 'Senatrice', 'Repubblica Galattica', 'Oppositrice di Palpatine', 'Alleanza Ribelle', 'Leader politica', 'Briefing di Endor', '«Molti Bothan…»'], points: cluePoints },
        { answer: 'C-3PO', acceptedAnswers: ['C3PO', '3PO'], clues: ['112 BBY', 'Tatooine', 'Oltre sei milioni', 'Trilogia prequel', 'Trilogia originale', 'Trilogia sequel', 'R2-D2', 'Corpo dorato', 'Costruito da Anakin', '«Padrone Luke»'], points: cluePoints },
        { answer: 'Grand Moff Tarkin', acceptedAnswers: ['Tarkin', 'Wilhuff Tarkin'], clues: ['64 BBY', 'Eriadu', 'Maschio', 'Impero Galattico', 'Governatore', 'Muore a Yavin', 'Distruzione di Alderaan', 'Superarma imperiale', 'Morte Nera', 'Grand Moff'], points: cluePoints },
        { answer: 'Comandante Cody', acceptedAnswers: ['Cody', 'CC-2224', 'Commander Cody'], clues: ['CC-2224', 'Maschio', 'Kamino', 'Clone', '212° Battaglione', 'Armatura arancione', 'Utapau', 'Generale Kenobi', 'Ordine 66', 'Comandante'], points: cluePoints },
        { answer: 'Capitano Phasma', acceptedAnswers: ['Phasma', 'Captain Phasma'], clues: ['Parnassos', 'Femmina', 'Umana', 'Trilogia sequel', 'Primo Ordine', 'Capitano', 'Stormtrooper', 'FN-2187', 'Armatura cromata', 'Nemica di Finn'], points: cluePoints },
        { answer: 'Generale Hux', acceptedAnswers: ['Hux', 'Armitage Hux', 'General Hux'], clues: ['Arkanis', 'Maschio', 'Umano', 'Trilogia sequel', 'Primo Ordine', 'Generale', 'Base Starkiller', 'Rivale di Kylo Ren', 'Tradisce il Primo Ordine', '«Sono io la spia»'], points: cluePoints },
        { answer: 'Jabba the Hutt', acceptedAnswers: ['Jabba', 'Jabba lo Hutt'], clues: ['600 BBY', 'Maschio', 'Tatooine', 'Signore del crimine', 'Palazzo', 'Rancore', 'Taglia su Han Solo', 'Barge a vela', 'Leia prigioniera', 'Strangolato da Leia'], points: cluePoints },
        { answer: 'Orson Krennic', acceptedAnswers: ['Krennic', 'Direttore Krennic'], clues: ['Umano', 'Maschio', 'Impero Galattico', 'Direttore', 'Divisa bianca', 'Galen Erso', 'Progetto Stardust', 'Rivale di Tarkin', 'Morte Nera', 'Muore su Scarif'], points: cluePoints },
        { answer: 'Finn', acceptedAnswers: ['FN-2187', 'FN 2187'], clues: ['FN-2187', 'Maschio', 'Umano', 'Trilogia sequel', 'Primo Ordine', 'Stormtrooper', 'Jakku', 'Poe Dameron', 'Abbandona il Primo Ordine', 'Amico di Rey'], points: cluePoints }
      ]
    },
    {
      id: 'star-wars-geoguessr',
      type: 'geoguessr',
      title: 'Geoguessr',
      menuTitle: 'GEOGUESSR',
      points: 300,
      questions: [
        ['naboo', 'Naboo'], ['alderaan', 'Alderaan'], ['coruscant', 'Coruscant'], ['tatooine', 'Tatooine'], ['endor', 'Endor'],
        ['dagobah', 'Dagobah'], ['ferrix', 'Ferrix'], ['hoth', 'Hoth'], ['kamino', 'Kamino'], ['mustafar', 'Mustafar']
      ].map(([slug, answer]) => ({
        prompt: 'Su quale pianeta si trova questo luogo?',
        image: `public/assets/star-wars/geoguessr/${slug}.webp`,
        answer
      }))
    },
    {
      id: 'star-wars-jeopardy',
      type: 'jeopardy',
      title: 'Jeopardy',
      menuTitle: 'JEOPARDY',
      categories: [
        {
          name: 'Star Wish',
          clues: [
            { value: 100, question: 'Le sigarette lo hanno distrutto. Respira male e, come il classico padre americano, quando è andato a comprarle non è più tornato a casa.', answer: 'Darth Vader', acceptedAnswers: ['Vader', 'Anakin Skywalker'] },
            { value: 200, question: 'Autista abusivo con un furgone truccato e debiti con la mafia. Tende a scoparsi le sorelle degli amici.', answer: 'Han Solo', acceptedAnswers: ['Han'] },
            { value: 300, question: 'Pensionato sardo ultracentenario che vive in una palude.', answer: 'Yoda', acceptedAnswers: ['Maestro Yoda'] },
            { value: 400, question: 'Paninaro napoletano sovrappeso con canotta unta e trascorsi nella Camorra.', answer: 'Dexter Jettster', acceptedAnswers: ['Dexter'] },
            { value: 500, question: 'Collezionista compulsivo leggermente ossessionato con i Jedi.', answer: 'Generale Grievous', acceptedAnswers: ['Grievous', 'General Grievous'] }
          ]
        },
        {
          name: 'TripWarsvisor',
          clues: [
            { value: 100, question: 'Due soli, caldo insopportabile e sabbia dappertutto. La gente del posto cerca di venderti droidi rubati. Nessun mare. Non tornerò.', answer: 'Tatooine' },
            { value: 200, question: 'La foresta è splendida e la fauna interessante. Gli abitanti locali sono adorabili finché non scopri che avevano intenzione di cucinarti vivo.', answer: 'Endor' },
            { value: 300, question: 'Piove 24 ore su 24. Vivono in palafitte moderne, ma pur sempre in palafitte. Poi si assomigliano tutti…', answer: 'Kamino' },
            { value: 400, question: 'Vista spettacolare, sembra di stare tra le nuvole! Il proprietario però ha snitchato i miei amici agli sbirri.', answer: 'Città delle Nuvole, Bespin', acceptedAnswers: ['Bespin', 'Città delle Nuvole', 'Cloud City'] },
            { value: 500, question: 'Il mare è bellissimo, peccato che sia pieno di immondizia.', answer: 'Kef Bir' }
          ]
        },
        {
          name: 'Tinderata Galattica',
          clues: [
            { value: 100, question: '19 anni — Tatooine\nAmo guardare i tramonti. 🌅\nSogno di diventare pilota. ✈️\nDroids addicted. 🤖\nVivo ancora con gli zii, ma è una questione temporanea. 👨‍👩‍👦', answer: 'Luke Skywalker', acceptedAnswers: ['Luke'] },
            { value: 200, question: '32 anni — Corellia\nHo una nave tutta mia. 🚀\nCoinquilino pelosetto. 🐻\nImprenditore indipendente nel settore import/export. 💰\nChi spara per primo spara due volte. 🔫', answer: 'Han Solo', acceptedAnswers: ['Han'] },
            { value: 300, question: '22 anni — Naboo\nQueen. 💅\nScienze Politiche. 🏛️\nMorirei per il mio uomo. ❤️\nNo estremisti. No possessivi. Se non ti piace la sabbia swipe a sinistra. ❌', answer: 'Padmé', acceptedAnswers: ['Padme', 'Padmé Amidala', 'Padme Amidala'] },
            { value: 400, question: 'Libero professionista. 🔫\nPadre single. 👨‍👦\nAccetto incarichi ben pagati. 💰\nMi dicono spesso che in giro ci sono uomini che mi somigliano. Non so perché. 🤷‍♂️', answer: 'Jango Fett', acceptedAnswers: ['Jango'] },
            { value: 500, question: 'Imprenditore nel commercio ricambi e tecnologia. 🔧\nHo un problema con le scommesse e con i dadi. 🎲\nI trucchi mentali non funzionano con me. 🧠', answer: 'Watto' }
          ]
        },
        {
          name: 'LinkedIn Spaziale',
          clues: [
            { value: 100, question: 'Esperienza\n• Ammiraglio\n• Comandante della Flotta Ribelle\n\nCompetenze\n• Strategia navale\n• Coordinamento flotte\n• Identificazione tardiva di trappole', answer: 'Ammiraglio Ackbar', acceptedAnswers: ['Ackbar', 'Admiral Ackbar'] },
            { value: 200, question: 'Esperienza\n• Leader politico\n• Senatore\n• Fondatore della Ribellione\n\nCompetenze\n• Diplomazia\n• Mediazione\n• Finanziamento di movimenti clandestini', answer: 'Bail Organa', acceptedAnswers: ['Bail'] },
            { value: 300, question: 'Esperienza\n• Viceré\n• Dirigente della Federazione dei Mercanti\n• Membro della Confederazione dei Sistemi Indipendenti\n\nCompetenze\n• Embargo\n• Gestione droidi\n• Pressione politica\n• Prendere pessime decisioni strategiche', answer: 'Nute Gunray', acceptedAnswers: ['Nute'] },
            { value: 400, question: "Esperienza\n• Storico dell'Ordine Jedi\n• Responsabile archivi\n\nCompetenze\n• Catalogazione\n• Ricerca storica\n• Gestione dati\n• Negazione categorica dell'esistenza di pianeti mancanti", answer: 'Jocasta Nu', acceptedAnswers: ['Jocasta'] },
            { value: 500, question: 'Esperienza\n• Primo Ministro\n• Responsabile relazioni istituzionali\n\nCompetenze\n• Project management\n• Produzione su larga scala\n• Gestione clienti\n• Clonazione industriale', answer: 'Lama Su' }
          ]
        },
        {
          name: 'Titoli Clickbait',
          clues: [
            { value: 100, question: '🚨 «RAGAZZO DI 19 ANNI DISTRUGGE INSTALLAZIONE MILITARE DA MILIARDI DI CREDITI: scopri il trucco che ha fatto INFURIARE l’Impero!»', answer: 'Episodio IV', acceptedAnswers: ['Episodio 4', 'Una nuova speranza', 'A New Hope'] },
            { value: 200, question: '😱 «GLI TAGLIA UNA MANO E POI GLI RIVELA UN SEGRETO DI FAMIGLIA: la sua reazione lascia tutti senza parole!»', answer: 'Episodio V', acceptedAnswers: ["Episodio 5", "L'Impero colpisce ancora", 'The Empire Strikes Back'] },
            { value: 300, question: '🔥 «RAGAZZO TROVA SUA MADRE DOPO ANNI: la reazione è da non credere!»', answer: 'Episodio II', acceptedAnswers: ["Episodio 2", "L'attacco dei cloni", 'Attack of the Clones'] },
            { value: 400, question: '🪖 «SOLDATO DISERTA E PRENDE UNA DECISIONE CHE GLI COSTERÀ TUTTO!»', answer: 'Episodio VII', acceptedAnswers: ['Episodio 7', 'Il risveglio della Forza', 'The Force Awakens'] },
            { value: 500, question: '👅 «LECCA UNA SUPERFICIE BIANCA E FA UNA SCOPERTA INCREDIBILE: “Non è quello che pensavo!”»', answer: 'Episodio VIII', acceptedAnswers: ["Episodio 8", "Gli ultimi Jedi", 'The Last Jedi'] }
          ]
        }
      ]
    },
    {
      id: 'star-wars-pass',
      type: 'pass',
      title: 'Passaparola',
      menuTitle: 'PASSAPAROLA',
      difficulty: 'facile',
      duration: 300,
      points: { facile: 5, medio: 10, difficile: 20 },
      bonus: { facile: 200, medio: 500, difficile: 1000 },
      questions: passQuestionSets.facile,
      questionSets: passQuestionSets
    }
  ];
}
