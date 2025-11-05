"use client";
import { useEffect, useMemo, useRef, useState } from 'react';

type ReminderState = {
  goal: string;
  intervalMinutes: number;
  notificationPermission: NotificationPermission;
  running: boolean;
};

const STORAGE_KEY = 'goal-coach-state-v1';

function loadState(): ReminderState {
  if (typeof window === 'undefined') return { goal: '', intervalMinutes: 25, notificationPermission: 'default', running: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { goal: '', intervalMinutes: 25, notificationPermission: Notification.permission, running: false };
    const parsed = JSON.parse(raw) as Partial<ReminderState>;
    return {
      goal: parsed.goal ?? '',
      intervalMinutes: parsed.intervalMinutes ?? 25,
      notificationPermission: Notification.permission,
      running: parsed.running ?? false
    };
  } catch {
    return { goal: '', intervalMinutes: 25, notificationPermission: Notification.permission, running: false };
  }
}

function saveState(next: ReminderState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function generateMessage(goal: string): string {
  const now = new Date();
  const hours = now.getHours();
  const partOfDay = hours < 12 ? 'morning' : hours < 18 ? 'afternoon' : 'evening';
  const prompts = [
    `Quick ${partOfDay} push: 10 focused minutes on ?${goal}?. Start now.`,
    `Tiny step on ?${goal}? right now. Open the first tab and begin.`,
    `Momentum beats motivation. What is the next 5-minute action for ?${goal}??`,
    `Protect your time: 1 small commit on ?${goal}?.`,
    `Future-you will thank you. Nudge ?${goal}? forward.`
  ];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

export default function Page() {
  const [state, setState] = useState<ReminderState>(loadState());
  const [nextAt, setNextAt] = useState<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    // Register service worker for notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const schedule = useMemo(() => state.intervalMinutes * 60 * 1000, [state.intervalMinutes]);

  function showReminder() {
    const msg = generateMessage(state.goal || 'your goal');

    if (state.notificationPermission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.showNotification('Time to move your goal', {
          body: msg,
          icon: '/icons/icon-192.png',
          badge: '/icons/badge.png',
          tag: 'goal-reminder'
        });
      });
    }

    // Also visible inline for users without notifications
    // Set a very subtle document title nudge
    const orig = document.title;
    document.title = '? ' + orig;
    setTimeout(() => (document.title = orig), 4000);
  }

  function start() {
    if (!state.goal.trim()) {
      alert('Set a goal first.');
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current as unknown as number);
    timerRef.current = setInterval(() => {
      showReminder();
      setNextAt(new Date(Date.now() + schedule));
    }, schedule);
    setNextAt(new Date(Date.now() + schedule));
    setState((s) => ({ ...s, running: true }));
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current as unknown as number);
    timerRef.current = null;
    setNextAt(null);
    setState((s) => ({ ...s, running: false }));
  }

  async function requestPermission() {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setState((s) => ({ ...s, notificationPermission: perm }));
  }

  function shareLink() {
    const params = new URLSearchParams({
      goal: state.goal,
      interval: String(state.intervalMinutes)
    });
    const url = `${location.origin}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    alert('Shareable setup link copied to clipboard');
  }

  function openICS() {
    const params = new URLSearchParams({
      title: state.goal || 'Goal Focus Session',
      interval: String(state.intervalMinutes),
      duration: '5'
    });
    const url = `/api/ics?${params.toString()}`;
    window.location.href = url;
  }

  useEffect(() => {
    // Apply deep link params if present
    const sp = new URLSearchParams(window.location.search);
    const g = sp.get('goal');
    const i = sp.get('interval');
    if (g || i) {
      setState((s) => ({
        ...s,
        goal: g ?? s.goal,
        intervalMinutes: i ? Math.max(1, Number(i)) : s.intervalMinutes
      }));
    }
  }, []);

  return (
    <main className="container">
      <header className="header">
        <h1>Goal Coach Agent</h1>
        <p className="subtitle">Gentle nudges to move your goal forward.</p>
      </header>

      <section className="card">
        <label className="label">Your goal</label>
        <input
          className="input"
          placeholder="e.g., Write my book for 30 minutes/day"
          value={state.goal}
          onChange={(e) => setState((s) => ({ ...s, goal: e.target.value }))}
        />

        <div className="row">
          <div className="col">
            <label className="label">Reminder frequency</label>
            <select
              className="select"
              value={state.intervalMinutes}
              onChange={(e) => setState((s) => ({ ...s, intervalMinutes: Number(e.target.value) }))}
            >
              <option value={15}>Every 15 minutes</option>
              <option value={25}>Every 25 minutes (Pomodoro)</option>
              <option value={45}>Every 45 minutes</option>
              <option value={60}>Every 60 minutes</option>
            </select>
          </div>
          <div className="col">
            <label className="label">Notifications</label>
            <div className="notif">
              <button className="button secondary" onClick={requestPermission} disabled={state.notificationPermission === 'granted'}>
                {state.notificationPermission === 'granted' ? 'Enabled' : 'Enable notifications'}
              </button>
            </div>
          </div>
        </div>

        <div className="row">
          {!state.running ? (
            <button className="button primary" onClick={start}>Start reminders</button>
          ) : (
            <button className="button" onClick={stop}>Stop</button>
          )}
          <button className="button" onClick={shareLink}>Copy shareable setup link</button>
          <button className="button" onClick={openICS}>Add to calendar (ICS)</button>
        </div>

        <div className="meta">
          {state.running && nextAt ? (
            <span>Next reminder at {nextAt.toLocaleTimeString()}</span>
          ) : (
            <span>Reminders are paused</span>
          )}
        </div>
      </section>

      <section className="tips">
        <h2>Coach</h2>
        <p>{generateMessage(state.goal || 'your goal')}</p>
      </section>
    </main>
  );
}
