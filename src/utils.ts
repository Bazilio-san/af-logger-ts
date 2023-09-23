/* eslint-disable no-console */
import * as fse from 'fs-extra';
import * as fs from 'fs';
import * as fsPath from 'path';
import { TErr } from './interfaces';

export interface IFileInfo {
  name: string,
  path: string,
  size: number,
  created: number
}

export const normalizePath = (path: string) => fsPath.normalize(fsPath.resolve(path)).replace(/\\/g, '/');

export const getFiles = (dir: string): IFileInfo[] => {
  dir = fse.realpathSync(dir);
  if (!fs.existsSync(dir) || !fse.statSync(dir).isDirectory()) {
    return [];
  }
  const files: IFileInfo[] = [];
  fse.readdirSync(dir).forEach((name) => {
    const path = normalizePath(`${dir}/${name}`);
    const syncObj = fs.statSync(path);
    if (!syncObj.isDirectory()) {
      files.push({ name, path, size: syncObj.size, created: syncObj.ctimeMs });
    }
  });
  return files;
};

export const date2YMD = (d?: Date): string => (d || new Date()).toISOString().replace(/-/g, '').substring(0, 8);

/**
 * Removes from the specified folder files that are smaller than minSize and
 * with a creation date older than the current one.
 */
export const removeEmptyLogs = (dir: string, fileRe: RegExp, minSize = 0): void => {
  if (!dir || !fileRe) {
    return;
  }
  const filesToDelete = getFiles(dir).filter(({ name, size, created }: IFileInfo) => {
    if (size < minSize) {
      return false;
    }
    if (Date.now() - created < 60_000) {
      return false;
    }
    const match = fileRe.exec(name);
    if (!match) {
      return false;
    }
    return match[1].replace(/-/g, '') < date2YMD();
  });
  filesToDelete.forEach(({ path }: IFileInfo) => {
    try {
      fs.unlinkSync(path);
    } catch (err: TErr) {
      console.log(err.message);
    }
    console.log(`Removed empty log file "${path}"`);
  });
};

// VVR
export const isObject = (v: any): boolean => v != null
  && typeof v === 'object'
  && !Array.isArray(v)
  && !(v instanceof Date)
  && !(v instanceof Set)
  && !(v instanceof Map);

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

const reduceError = (err: TErr) => {
  const namesSet = new Set(Object.getOwnPropertyNames(err));
  // eslint-disable-next-line guard-for-in,no-restricted-syntax
  for (const k in err) {
    namesSet.add(k);
  }
  // eslint-disable-next-line no-new-object
  const o: { [key: string]: any } = new Object(null);
  // eslint-disable-next-line guard-for-in,no-restricted-syntax
  for (const k of namesSet) {
    const v = ['stack', 'message', 'code', 'name'].includes(k) ? err[k] : reducePropertyValue(err[k]);
    if (v != null && v !== '') {
      o[k] = v;
    }
  }
  return o;
};

export const reduceAnyError = (err: TErr) => {
  if (typeof err === 'string') {
    return err;
  }
  if (typeof err === 'object') {
    if (Array.isArray(err)) {
      return JSON.stringify(err, undefined, 2).substring(0, 300);
    }
    if (err.nativeError) {
      return reduceError(err.nativeError);
    }
    if (err instanceof Error || (err.stack && err.message)) {
      return reduceError(err);
    }
    return err;
  }
};
