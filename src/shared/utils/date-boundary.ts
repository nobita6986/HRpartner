export function getExpirationBoundaryBkk(anchorUtc: Date | string, nCalendarDays: number): Date {
  const date = new Date(anchorUtc);
  
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
  const bkkMidnight = new Date(`${year}-${month}-${day}T00:00:00+07:00`);
  
  // Add nCalendarDays. JS Date will automatically handle month/year rollovers.
  bkkMidnight.setDate(bkkMidnight.getDate() + nCalendarDays);
  
  return bkkMidnight;
}
