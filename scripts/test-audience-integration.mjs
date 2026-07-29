import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Imposta SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY prima del test.');
}

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const token = label => `${label}-${globalThis.crypto.randomUUID()}-${globalThis.crypto.randomUUID()}`;

async function rpc(name, parameters) {
  const { data, error } = await client.rpc(name, parameters);
  assert.ifError(error);
  return data;
}

const hostSecret = token('host');
const session = await rpc('create_audience_session', {
  p_host_secret: hostSecret,
  p_title: 'Test spettatori'
});
assert.match(session.code, /^[A-Z0-9]{6}$/);

const aliceSecret = token('alice');
const alice = await rpc('join_audience_session', {
  p_code: session.code,
  p_nickname: 'Alice',
  p_participant_secret: aliceSecret
});
assert.equal(alice.ok, true);

const duplicate = await rpc('join_audience_session', {
  p_code: session.code,
  p_nickname: 'ALICE',
  p_participant_secret: token('duplicate')
});
assert.deepEqual(duplicate, { ok: false, reason: 'nickname_taken' });

const concurrentJoins = await Promise.all([
  rpc('join_audience_session', {
    p_code: session.code,
    p_nickname: 'Bob',
    p_participant_secret: token('bob-1')
  }),
  rpc('join_audience_session', {
    p_code: session.code,
    p_nickname: 'bob',
    p_participant_secret: token('bob-2')
  })
]);
assert.equal(concurrentJoins.filter(result => result.ok).length, 1);
assert.equal(concurrentJoins.filter(result => result.reason === 'nickname_taken').length, 1);

await rpc('sync_audience_session', {
  p_code: session.code,
  p_host_secret: hostSecret,
  p_state: {
    status: 'live',
    gameTitle: 'Indovina il personaggio',
    questionKey: 'guess:round:1',
    questionType: 'guess',
    prompt: 'Immagine 1',
    points: 1000,
    revealStep: 1,
    accepting: true,
    answerRules: [{ answer: 'Aizen', points: 1000 }]
  }
});

const wrong = await rpc('submit_audience_answer', {
  p_code: session.code,
  p_participant_secret: aliceSecret,
  p_answer: 'Ichigo'
});
assert.deepEqual(
  { ok: wrong.ok, result: wrong.result, score: wrong.score },
  { ok: true, result: 'wrong', score: 0 }
);

const repeatedStage = await rpc('submit_audience_answer', {
  p_code: session.code,
  p_participant_secret: aliceSecret,
  p_answer: 'Aizen'
});
assert.equal(repeatedStage.reason, 'already_answered');

await rpc('sync_audience_session', {
  p_code: session.code,
  p_host_secret: hostSecret,
  p_state: {
    status: 'live',
    gameTitle: 'Indovina il personaggio',
    questionKey: 'guess:round:1',
    questionType: 'guess',
    prompt: 'Immagine 2',
    points: 500,
    revealStep: 2,
    accepting: true,
    answerRules: [{ answer: 'Aizen', points: 500 }]
  }
});

const correct = await rpc('submit_audience_answer', {
  p_code: session.code,
  p_participant_secret: aliceSecret,
  p_answer: 'aìzen'
});
assert.deepEqual(
  { ok: correct.ok, result: correct.result, score: correct.score, points: correct.pointsAwarded },
  { ok: true, result: 'correct', score: 500, points: 500 }
);

const afterCorrect = await rpc('submit_audience_answer', {
  p_code: session.code,
  p_participant_secret: aliceSecret,
  p_answer: 'Aizen'
});
assert.equal(afterCorrect.reason, 'already_correct');

const leaderboard = await rpc('get_audience_leaderboard', {
  p_code: session.code,
  p_limit: 5000
});
assert.equal(leaderboard.ok, true);
assert.deepEqual(
  {
    nickname: leaderboard.leaderboard[0].nickname,
    score: leaderboard.leaderboard[0].score,
    classicPlayersPresent: leaderboard.leaderboard.some(row => ['LIVIO', 'MELIA', 'MAGGI'].includes(row.nickname))
  },
  { nickname: 'Alice', score: 500, classicPlayersPresent: false }
);

const directRead = await client.from('audience_sessions').select('*');
assert.ok(directRead.error, 'Le tabelle private non devono essere leggibili dalla Data API.');

await rpc('sync_audience_session', {
  p_code: session.code,
  p_host_secret: hostSecret,
  p_state: {
    status: 'finished',
    gameTitle: '',
    questionKey: '',
    questionType: '',
    prompt: 'Partita terminata',
    points: 0,
    revealStep: 0,
    accepting: false,
    answerRules: []
  }
});

console.log(`Audience integration OK · stanza ${session.code} · ${leaderboard.leaderboard.length} partecipanti`);
