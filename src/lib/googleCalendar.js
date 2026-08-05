// src/lib/googleCalendar.js
// Handles Google Calendar API v3 calls using the user's OAuth access token.
// Tokens are obtained via Firebase Auth (GoogleAuthProvider with calendar scope).

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

/**
 * Fetch the list of calendars for the authenticated user.
 * @param {string} accessToken - Google OAuth access token
 */
export async function fetchCalendarList(accessToken) {
  const res = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Calendar list fetch failed: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

/**
 * Fetch events from a specific calendar within a date range.
 * @param {string} accessToken
 * @param {string} calendarId - e.g. "primary" or specific calendar ID
 * @param {Date} timeMin
 * @param {Date} timeMax
 */
export async function fetchCalendarEvents(accessToken, calendarId, timeMin, timeMax) {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const res = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Events fetch failed: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

/**
 * Fetch events for the current month from all linked calendars.
 * @param {string} accessToken
 * @param {string[]} calendarIds - list of calendar IDs to fetch
 * @param {Date} monthStart
 * @param {Date} monthEnd
 */
export async function fetchAllLinkedCalendarEvents(accessToken, calendarIds, monthStart, monthEnd) {
  const results = await Promise.allSettled(
    calendarIds.map((id) => fetchCalendarEvents(accessToken, id, monthStart, monthEnd))
  );

  const events = [];
  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      result.value.forEach((evt) => {
        events.push({ ...evt, _calendarId: calendarIds[idx] });
      });
    } else {
      console.warn(`Failed to fetch events for calendar ${calendarIds[idx]}:`, result.reason);
    }
  });

  return events;
}

/**
 * Normalize a Google Calendar event into a common shape used by the app.
 */
export function normalizeGCalEvent(evt) {
  const isAllDay = !evt.start?.dateTime && !!evt.start?.date;
  const start = evt.start?.dateTime || evt.start?.date;
  const end = evt.end?.dateTime || evt.end?.date;

  // For all-day events, parse date as local time (not UTC) to avoid timezone shift
  let startDate = null;
  let endDate = null;
  if (start) {
    if (isAllDay) {
      const [y, m, d] = start.split('-').map(Number);
      startDate = new Date(y, m - 1, d, 0, 0, 0);
    } else {
      startDate = new Date(start);
    }
  }
  if (end) {
    if (isAllDay) {
      const [y, m, d] = end.split('-').map(Number);
      endDate = new Date(y, m - 1, d, 0, 0, 0);
    } else {
      endDate = new Date(end);
    }
  }

  let duration = 60; // default 60 min
  if (startDate && endDate) {
    duration = Math.round((endDate - startDate) / 60000);
  }

  return {
    id: evt.id,
    title: evt.summary || '(No title)',
    type: 'event',
    duration,
    startDate,
    endDate,
    location: evt.location || null,
    description: evt.description || null,
    htmlLink: evt.htmlLink || null,
    _source: 'google',
    _calendarId: evt._calendarId,
  };
}
