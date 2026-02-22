function normalizeTwoDigitYear(twoDigitYear) {
  const y = Number(twoDigitYear);
  if (Number.isNaN(y)) return null;
  return y >= 70 ? 1900 + y : 2000 + y;
}

function parseFlexibleDate(value) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();

  const isoDateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const year = Number(isoDateOnly[1]);
    const month = Number(isoDateOnly[2]);
    const day = Number(isoDateOnly[3]);
    const dt = new Date(year, month - 1, day);
    const isSameDate =
      dt.getFullYear() === year &&
      dt.getMonth() === month - 1 &&
      dt.getDate() === day;
    return isSameDate ? dt : null;
  }

  const br = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]);
    const year =
      br[3].length === 2 ? normalizeTwoDigitYear(br[3]) : Number(br[3]);

    if (!year) return null;

    const dt = new Date(year, month - 1, day);
    const isSameDate =
      dt.getFullYear() === year &&
      dt.getMonth() === month - 1 &&
      dt.getDate() === day;

    return isSameDate ? dt : null;
  }

  const dt = new Date(trimmed);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function parseDateValue(value) {
  return parseFlexibleDate(value);
}

export function formatDateBR(value) {
  const date = parseFlexibleDate(value);
  if (!date) return "-";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTimeBR(value, options = {}) {
  const date = parseFlexibleDate(value);
  if (!date) return "-";

  const includeSeconds = options.includeSeconds === true;
  const formatted = date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
  });

  return formatted.replace(",", "");
}
