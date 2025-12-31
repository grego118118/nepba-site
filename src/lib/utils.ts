export function cn(
  ...classes: Array<string | number | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

export interface TimeRemaining {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function getTimeRemaining(target: Date | null): TimeRemaining | null {
  if (!target) return null;
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  let remaining = Math.floor(diff / 1000);
  const seconds = remaining % 60;
  remaining = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  remaining = Math.floor(remaining / 60);
  const hours = remaining % 24;
  const daysTotal = Math.floor(remaining / 24);

  const years = Math.floor(daysTotal / 365);
  const daysAfterYears = daysTotal % 365;
  const months = Math.floor(daysAfterYears / 30);
  const days = daysAfterYears % 30;

  return { years, months, days, hours, minutes, seconds };
}

