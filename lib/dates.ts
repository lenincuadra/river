// Fechas relativas compactas en español ("hace 3 días", "ayer") para los
// previews de la UI (switcher de topics). La fecha absoluta vive en cada vista.
export function fmtRelative(iso: string): string {
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const diffMs = new Date(iso).getTime() - Date.now();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes === 0) return "recién";
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return rtf.format(months, "month");
  return rtf.format(Math.round(months / 12), "year");
}
