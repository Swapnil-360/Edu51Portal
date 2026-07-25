/**
 * Google Calendar API Service
 * Handles authentication and routine event operations with Google Calendar
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

let gisLoadedPromise: Promise<void> | null = null;

/**
 * Load Google Identity Services script if not already loaded
 */
export function loadGisScript(): Promise<void> {
  if (gisLoadedPromise) return gisLoadedPromise;

  gisLoadedPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoadedPromise = null;
      reject(new Error('Failed to load Google Identity Services script'));
    };
    document.body.appendChild(script);
  });

  return gisLoadedPromise;
}

/**
 * Request Calendar authorization token from GIS
 */
export function requestCalendarToken(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      await loadGisScript();

      if (!CLIENT_ID) {
        return reject(new Error('Google Client ID is missing. Please configure VITE_GOOGLE_CLIENT_ID.'));
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: CALENDAR_SCOPE,
        callback: (response: any) => {
          if (response.error) {
            reject(response);
            return;
          }
          resolve(response.access_token);
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Helper to calculate next weekday date
 */
function getNextWeekdayDate(day: string, timeStr: string): Date {
  const daysOfWeek: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  };
  const targetDayNum = daysOfWeek[day];
  if (targetDayNum === undefined) return new Date();

  const now = new Date();
  const currentDayNum = now.getDay();

  let daysUntilTarget = targetDayNum - currentDayNum;
  if (daysUntilTarget < 0) {
    daysUntilTarget += 7; // Next week
  } else if (daysUntilTarget === 0) {
    // If it's today, check if class time has already passed
    const [hours, minutes] = timeStr.split(':').map(Number);
    const todayTarget = new Date(now);
    todayTarget.setHours(hours, minutes, 0, 0);
    if (now.getTime() > todayTarget.getTime()) {
      daysUntilTarget += 7;
    }
  }

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntilTarget);

  const [hours, minutes] = timeStr.split(':').map(Number);
  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate;
}

/**
 * Sync entire routine to Google Calendar
 */
export async function syncRoutineToGoogleCalendar(
  entries: any[],
  progressCallback: (msg: string) => void
): Promise<void> {
  progressCallback('Authenticating with Google...');
  const token = await requestCalendarToken();

  progressCallback('Checking for existing routine events...');
  // List events with our private extended property
  const listUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=edu51PortalRoutine=true';
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!listRes.ok) {
    const errorText = await listRes.text();
    throw new Error(`Failed to list calendar events: ${errorText}`);
  }
  const listData = await listRes.json();
  const existingEvents = listData.items || [];

  if (existingEvents.length > 0) {
    progressCallback(`Cleaning up ${existingEvents.length} previously synced classes...`);
    await Promise.all(
      existingEvents.map((evt: any) =>
        fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${evt.id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          }
        )
      )
    );
  }

  if (entries.length === 0) {
    progressCallback('Calendar cleared successfully!');
    return;
  }

  progressCallback(`Syncing ${entries.length} classes to Google Calendar...`);
  const daysMap: Record<string, string> = {
    Sun: 'SU', Mon: 'MO', Tue: 'TU', Wed: 'WE', Thu: 'TH', Fri: 'FR', Sat: 'SA'
  };

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka';

  await Promise.all(
    entries.map(async (e) => {
      const startDateTime = getNextWeekdayDate(e.day, e.start);
      const endDateTime = new Date(startDateTime);
      const [endH, endM] = e.end.split(':').map(Number);
      endDateTime.setHours(endH, endM, 0, 0);

      const rruleDay = daysMap[e.day] || 'SU';

      const body = {
        summary: e.courseCode ? `${e.title} (${e.courseCode})` : e.title,
        description: [
          `Class Routine synced from Edu51Portal.`,
          `Type: ${e.type} (${e.mode})`,
          e.room ? `Room: ${e.room}` : '',
          e.teacher ? `Teacher: ${e.teacher}` : '',
          e.section ? `Section: ${e.section}` : ''
        ].filter(Boolean).join('\n'),
        start: {
          dateTime: startDateTime.toISOString().split('.')[0], // remove ms/UTC suffix for local ISO
          timeZone: userTimeZone
        },
        end: {
          dateTime: endDateTime.toISOString().split('.')[0],
          timeZone: userTimeZone
        },
        recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${rruleDay}`],
        extendedProperties: {
          private: {
            edu51PortalRoutine: 'true'
          }
        }
      };

      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to create calendar event:', errorText);
      }
    })
  );

  progressCallback('Successfully synced to Google Calendar!');
}
