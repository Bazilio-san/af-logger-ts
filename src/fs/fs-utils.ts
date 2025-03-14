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
 * Removes from the specified folder files that are smaller than minSize or
 * with a creation date older than the current one.
 */
export const removeEmptyLogs = (dir: string, fileRe: RegExp, minSize = 0, lifeTime = 0): void => {
  if (!dir || !fileRe) {
    return;
  }
  const filesToDelete = getFiles(dir).filter(({ name, size, created }: IFileInfo) => {
    const match = fileRe.exec(name);
    if (!match || Date.now() - created < 60_000) {
      return false;
    }

    if ((size <= minSize) || (lifeTime && (Date.now() - created > lifeTime))) {
      return true;
    }

    return false;
  });
  filesToDelete.forEach(({ path }: IFileInfo) => {
    try {
      fs.unlinkSync(path);
    } catch (err: Error | any) {
      console.log(err.message);
    }
    console.log(`Removed log file "${path}"`);
  });
};
