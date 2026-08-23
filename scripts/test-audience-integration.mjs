import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.AUDIENCE_ADMIN_EMAIL;
const adminPassword = process.env.AUDIENCE_ADMIN_PASSWORD;

if (!url || !key || !adminEmail || !adminPassword) {
  throw new Error('Imposta SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, AUDIENCE_ADMIN_EMAIL e AUDIENCE_ADMIN_PASSWORD prima del test.');
}

const publicClient = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const adminClient = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const token = label => `${label}-${globalThis.crypto.randomUUID()}-${globalThis.crypto.randomUUID()}`;

const { error: signInError } = await adminClient.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword
});
assert.ifError(signInError);

const { data: isAdmin, error: adminCheckError } = await adminClient.rpc('is_audience_admin');
assert.ifError(adminCheckError);
assert.equal(isAdmin, true);

async function rpc(name, parameters, { asAdmin = false } = {}) {
  const client = asAdmin ? adminClient : publicClient;
  const { data, error } = await client.rpc(name, parameters);
  assert.ifError(error);
  return data;
}

const hostSecret = token('host');
const session = await rpc('create_audience_session', {
  p_host_secret: hostSecret,
  p_title: 'Test spettatori'
}, { asAdmin: true });
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
}, { asAdmin: true });

const relaySnapshot = await rpc('get_audience_relay_snapshot', {
  p_code: session.code,
  p_host_secret: hostSecret
});
assert.deepEqual(
  {
    code: relaySnapshot.code,
    questionKey: relaySnapshot.questionKey,
    revealStep: relaySnapshot.revealStep,
    accepting: relaySnapshot.accepting,
    leaksAnswers: Object.hasOwn(relaySnapshot, 'answerRules')
  },
  {
    code: session.code,
    questionKey: 'guess:round:1',
    revealStep: 1,
    accepting: true,
    leaksAnswers: false
  }
);
const invalidRelayCredentials = await publicClient.rpc('get_audience_relay_snapshot', {
  p_code: session.code,
  p_host_secret: token('invalid-host')
});
assert.ok(invalidRelayCredentials.error, 'Il relay deve rifiutare un segreto host non valido.');

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
    answerRules: [
      { answer: 'Aizen', points: 500 },
      { answer: 'Sosuke Aizen', points: 500 }
    ]
  }
}, { asAdmin: true });

const correct = await rpc('submit_audience_answer', {
  p_code: session.code,
  p_participant_secret: aliceSecret,
  p_answer: 'Azien'
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

const directRead = await publicClient.from('audience_sessions').select('*');
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
}, { asAdmin: true });

console.log(`Audience integration OK · stanza ${session.code} · ${leaderboard.leaderboard.length} partecipanti`);
