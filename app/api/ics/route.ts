import { NextRequest } from 'next/server';

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get('title') ?? 'Goal Focus Session').slice(0, 120);
  const interval = Math.max(5, Number(searchParams.get('interval') ?? '25'));
  const duration = Math.max(5, Number(searchParams.get('duration') ?? '5'));

  const uid = `${Date.now()}@goal-coach`; // simple UID
  const dtStamp = new Date();
  const dtStart = new Date();

  const formatICS = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  // We create a 1-year recurring event every day at the time of generation, with an alarm that repeats every `interval` minutes
  const dtstamp = formatICS(dtStamp);
  const dtstart = formatICS(dtStart);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Goal Coach Agent//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    'SUMMARY:' + escapeText(title),
    'RRULE:FREQ=DAILY;INTERVAL=1;COUNT=365',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:' + escapeText('Nudge: ' + title),
    `TRIGGER:-PT0M`,
    `DURATION:PT${duration}M`,
    `REPEAT:${Math.floor((24 * 60) / interval)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="goal-reminder.ics"'
    }
  });
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
