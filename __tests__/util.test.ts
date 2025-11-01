/* eslint-disable no-console */

import { getFiles } from '../src/fs/fs-utils';
import { mapToWinstonLevel } from '../src';

const TIMEOUT_MILLIS = 100_000;

describe('Test utils', () => {
  test('getFiles()', async () => {
    const files = getFiles('./src');
    expect(files.length).toBeGreaterThan(3);
    const u = files.find((x: any) => x.name === 'utils.ts');
    expect(u).toBeTruthy();
    expect(u?.size).toBeGreaterThan(10);
  }, TIMEOUT_MILLIS);

  test('mapToWinstonLevel() - trace -> debug', () => {
    expect(mapToWinstonLevel('trace')).toBe('debug');
    expect(mapToWinstonLevel('TRACE')).toBe('debug');
  });

  test('mapToWinstonLevel() - fatal -> error', () => {
    expect(mapToWinstonLevel('fatal')).toBe('error');
    expect(mapToWinstonLevel('FATAL')).toBe('error');
  });

  test('mapToWinstonLevel() - standard levels pass through', () => {
    expect(mapToWinstonLevel('info')).toBe('info');
    expect(mapToWinstonLevel('error')).toBe('error');
    expect(mapToWinstonLevel('warn')).toBe('warn');
    expect(mapToWinstonLevel('debug')).toBe('debug');
    expect(mapToWinstonLevel('silly')).toBe('silly');
  });

  test('mapToWinstonLevel() - unknown levels default to info', () => {
    expect(mapToWinstonLevel('unknown')).toBe('info');
    expect(mapToWinstonLevel('custom')).toBe('info');
  });
});
