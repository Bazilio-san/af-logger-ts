/* eslint-disable no-console */
import { TErr } from './interfaces';

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
  if (typeof err === 'string') {
    return err;
  }
  if (typeof err === 'object') {
    if (Array.isArray(err) || stringify) {
      return JSON.stringify(err, removeCircularReferences(), 2).substring(0, 300);
    }
    if (err.nativeError) {
      return reduceError(err.nativeError, asObject);
    }
    if (err instanceof Error || (err.stack && err.message)) {
      return reduceError(err, asObject);
    }
    return err;
  }
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
