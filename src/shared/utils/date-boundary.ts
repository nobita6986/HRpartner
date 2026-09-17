export function getExpirationBoundaryBkk(anchorUtc: Date | string | number, nCalendarDays: number): Date {
  if (typeof nCalendarDays !== 'number' || !Number.isInteger(nCalendarDays) || nCalendarDays < 0) {
    throw new Error('nCalendarDays must be a non-negative integer');
  }

  const date = new Date(anchorUtc);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date anchor');
  }

  // Format the date in Asia/Bangkok to get the local YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  
  // Create the midnight timestamp in Asia/Bangkok (UTC+7)
  // en-CA format is YYYY-MM-DD which is exactly what we need
  const bkkMidnight = new Date(`${year}-${month}-${day}T00:00:00+07:00`);
  
  // Add nCalendarDays. JS Date will automatically handle month/year rollovers.
  // If nCalendarDays = 0, this returns the start of the current day in BKK.
  bkkMidnight.setDate(bkkMidnight.getDate() + nCalendarDays);
  
  return bkkMidnight;
}

export function isExpired(nowUtc: Date | string | number, expiresAtUtc: Date | string | number): boolean {
  const now = new Date(nowUtc);
  const expiresAt = new Date(expiresAtUtc);
  if (isNaN(now.getTime()) || isNaN(expiresAt.getTime())) {
    throw new Error('Invalid date input');
  }
  // now === expiresAt means expired at the consuming boundary
  return now.getTime() >= expiresAt.getTime();
}
