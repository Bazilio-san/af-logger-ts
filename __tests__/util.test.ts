/* eslint-disable no-console */

import { getFiles } from '../src/fs/fs-utils';

const TIMEOUT_MILLIS = 100_000;

describe('Test utils', () => {
  test('getFiles()', async () => {
    const files = getFiles('./src');
    expect(files.length).toBeGreaterThan(3);
    const u = files.find((x: any) => x.name === 'utils.ts');
    expect(u).toBeTruthy();
    expect(u?.size).toBeGreaterThan(10);
  }, TIMEOUT_MILLIS);
});
