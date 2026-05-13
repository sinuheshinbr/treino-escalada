const TZ = "America/Sao_Paulo";

export function getSaoPauloNow(): Date {
  const str = new Date().toLocaleString("en-US", { timeZone: TZ });
  return new Date(str);
}

export function getTodayKey(): string {
  return formatDate(getSaoPauloNow());
}

export function shiftDay(dayKey: string, days: number): string {
  const d = parseDate(dayKey);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function diffDays(from: string, to: string): number {
  const a = parseDate(from);
  const b = parseDate(to);
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}

export function isValidDayKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

export function formatDayBR(key: string): string {
  const d = parseDate(key);
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDayShortBR(key: string): string {
  const d = parseDate(key);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatRangeBR(from: string, to: string): string {
  if (from === to) return formatDayShortBR(from);
  const a = parseDate(from);
  const b = parseDate(to);
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const right = b.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${left} – ${right}`;
}

function parseDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
