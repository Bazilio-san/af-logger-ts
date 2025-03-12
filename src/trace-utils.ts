import { xterm } from 'cli-color';

const colorCash = new Map();

/** Возвращает «хэш» по traceId, чтобы для одного и того же traceId всегда выбирать один и тот же цвет */
function hashTraceIdToIndex (traceId: string): number {
  let hash = 0;
  for (let i = 0; i < traceId.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = (hash << 5) - hash + traceId.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Возвращает index кода цвета для данного traceId */
function getColorIdForTraceId (traceId: string): string {
  // Выбираем из подходящих цветов
  const index = 18 + (hashTraceIdToIndex(traceId) % 210);
  return index.toString();
}

/** Возвращает color-функцию по traceId */
export function getColorFn (traceId: string): (text: string) => void {
  let colorFn = colorCash.get(traceId);
  if (colorFn) {
    return colorFn;
  }
  colorFn = xterm(parseInt(getColorIdForTraceId(traceId), 10));
  colorCash.set(traceId, colorFn);
  return colorFn;
}
