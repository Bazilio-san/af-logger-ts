/* eslint-disable no-console */
import { allowedLogLevels, TErr, TFileLogLevel } from './interfaces';

const reducePropertyValue = (v: any) => {
  const type = typeof v;
  const reduceString = (str: string, n = 300) => {
    if (str) {
      return str.length > n ? `${str.substring(0, n)} ...` : str;
    }
    return str;
  };
  if (type === 'string') {
    return reduceString(v, 300);
  }
  if (['number', 'boolean'].includes(typeof v)) {
    return v;
  }
  if (typeof v === 'object') {
    let str;
    try {
      str = JSON.stringify(v);
    } catch (e) {
      //
    }
    if (str) {
      if (['config', 'request', 'response'].includes(typeof v)) {
        v = reduceString(str, 100);
      } else {
        v = str.length > 100 ? reduceString(str, 300) : v;
      }
      return v;
    }
  }
  return undefined;
};

const reduceError = (err: TErr, asObject: boolean = false) => {
  const namesSet = new Set(Object.getOwnPropertyNames(err));
  // eslint-disable-next-line guard-for-in,no-restricted-syntax
  for (const k in err) {
    namesSet.add(k);
  }
  // eslint-disable-next-line no-new-object
  const o = (asObject ? new Object(null) : new Error()) as { [key: string]: any };
  // eslint-disable-next-line guard-for-in,no-restricted-syntax
  for (const k of namesSet) {
    const v = ['stack', 'message', 'code', 'name'].includes(k) ? err[k] : reducePropertyValue(err[k]);
    if (v != null && v !== '') {
      o[k as string] = v;
    }
  }
  return o;
};

function removeCircularReferences () {
  const seen = new WeakSet();
  return (key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

export const reduceAnyError = (err: TErr, asObject: boolean = false, stringify: boolean = false) => {
  const safeStringify = (v: unknown) => {
    try {
      return JSON.stringify(v, removeCircularReferences());
    } catch (e) {
      // JSON.stringify может падать (BigInt, toJSON(), геттеры, и т.д.)
      if (e instanceof Error) {
        return `${e.name}: ${e.message}`;
      }
      return String(e);
    }
  };

  if (err == null) {
    return err; // null/undefined — возвращаем как есть (без падений)
  }

  if (typeof err === 'string') {
    return err;
  }

  // чтобы не получить неявный undefined на number/boolean/function/symbol/etc
  if (typeof err !== 'object') {
    return String(err);
  }

  // typeof err === 'object' (и точно не null)
  if (Array.isArray(err) || stringify) {
    return safeStringify(err);
  }

  let nativeError: unknown;
  try {
    nativeError = (err as any).nativeError;
  } catch {
    nativeError = undefined;
  }
  if (nativeError) {
    return reduceError(nativeError as any, asObject);
  }

  const maybeErr = err as any;
  if (err instanceof Error || (maybeErr?.stack && maybeErr?.message)) {
    return reduceError(err, asObject);
  }

  // Возвращаем объект как есть (но гарантируем, что до этого не упали на null/примитивах)
  return err;
};

const PRETTY_LOG_STYLES_DEFAULT = {
  logLevelName: {
    '*': ['bold', 'black', 'bgWhiteBright', 'dim'],
    SILLY: ['bold', 'white'],
    TRACE: ['bold', 'whiteBright'],
    DEBUG: ['bold', 'green'],
    INFO: ['bold', 'blue'],
    WARN: ['bold', 'yellow'],
    ERROR: ['bold', 'red'],
    FATAL: ['bold', 'redBright'],
  },
  dateIsoStr: 'white',
  filePathWithLine: 'white',
  name: ['white', 'bold'],
  nameWithDelimiterPrefix: ['white', 'bold'],
  nameWithDelimiterSuffix: ['white', 'bold'],
  errorName: ['bold', 'bgRedBright', 'whiteBright'],
  fileName: ['yellow'],
  fileNameWithLine: 'white',
};

const mergeIfExists = (target: any, source: any, exclude: string[] = []): any => {
  if (!source) {
    return;
  }
  Object.keys(target).filter((k) => !exclude.includes(k)).forEach((k) => {
    const v = source[k];
    if (v) {
      target[k] = v;
    }
  });
};

export const mergeStyles = (customStalesPartial: any): any => {
  const result: any = { ...PRETTY_LOG_STYLES_DEFAULT, logLevelName: { ...PRETTY_LOG_STYLES_DEFAULT.logLevelName } };
  mergeIfExists(result, customStalesPartial, ['logLevelName']);
  mergeIfExists(result.logLevelName, customStalesPartial?.logLevelName);
  return result;
};
/**
 * Maps tslog level names to winston-compatible level names
 * trace -> debug, fatal -> error
 */
export const mapToWinstonLevel = (logLevelName: string): TFileLogLevel => {
  const levelMap: Record<string, TFileLogLevel> = {
    trace: 'debug',
    fatal: 'error',
  };

  const lowerLevel = logLevelName.toLowerCase();
  return levelMap[lowerLevel]
    || (allowedLogLevels.includes(lowerLevel as TFileLogLevel) ? lowerLevel as TFileLogLevel : 'info');
};
