/* eslint-disable no-console */
import * as fse from 'fs-extra';
import * as fs from 'fs';
import * as fsPath from 'path';

export interface IFileInfo {
  name: string,
  path: string,
  size: number,
  created: number
}

export const normalizePath = (path: string) => fsPath.normalize(fsPath.resolve(path)).replace(/\\/g, '/');

/**
 * Returns a list of files in the specified folder
 */
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

/**
 * Returns a string in YYYYMMDD format for the passed JS date
 */
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
    } catch (err: Error | any) {
      console.log(err.message);
    }
    console.log(`Removed empty log file "${path}"`);
  });
};
