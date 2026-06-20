export function timerRemaining(timer, now = Date.now()) {
  if (!timer) return 0;
  const remaining = Number(timer.remaining ?? timer.duration ?? 0);
  if (!timer.running || !timer.startedAt) return Math.max(0, remaining);
  return Math.max(0, remaining - (now - Number(timer.startedAt)) / 1000);
}

export function formatTimer(seconds) {
  const safe = Math.max(0, Math.ceil(Number(seconds) || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function startTimer(timer, now = Date.now()) {
  if (!timer || timer.running || timerRemaining(timer, now) <= 0) return timer;
  timer.remaining = timerRemaining(timer, now);
  timer.startedAt = now;
  timer.running = true;
  return timer;
}

export function pauseTimer(timer, now = Date.now()) {
  if (!timer) return timer;
  timer.remaining = timerRemaining(timer, now);
  timer.startedAt = null;
  timer.running = false;
  return timer;
}

export function resetTimer(timer, duration = timer?.duration || 0) {
  if (!timer) return timer;
  timer.duration = Number(duration) || 0;
  timer.remaining = timer.duration;
  timer.startedAt = null;
  timer.running = false;
  timer.expired = false;
  return timer;
}
