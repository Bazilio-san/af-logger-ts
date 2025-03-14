import * as config from 'config';
import * as fse from 'fs-extra';
import * as fsPath from 'path';
import em from './ee';
import { getAFLogger, ILoggerSettings, tsLogLevelIdByName, TLogLevelName } from '../src';
import { normalizePath } from '../src/fs/fs-utils';

const minLevelName = config.get<TLogLevelName>('logger.level');
const prefix = config.get<string>('logger.prefix');
const logDir = './_test_tmp/_log';
fse.removeSync(logDir);

const loggerSettings: ILoggerSettings = {
  minLevel: tsLogLevelIdByName(minLevelName),
  name: prefix,
  filePrefix: prefix,
  logDir,
  minLogSize: 0,
  minErrorLogSize: 0,
  // displayLoggerName: true,
  // displayFunctionName: true,
  // displayFilePath: 'displayAll',
  emitter: em,
};

const { logger } = getAFLogger(loggerSettings);

const rootDir = process.cwd();

const TIMEOUT_MILLIS = 100_000;

describe('Test logger', () => {
  test('logger', async () => {
    logger.silly('write silly');
    logger.trace('write trace');
    logger.debug('write debug');
    logger.info('write info');
    logger.warn('write warn');
    logger.error('write error');
    logger.fatal('write fatal');
  }, TIMEOUT_MILLIS);

  [
    [undefined, fsPath.resolve(rootDir, '../logs')],
    ['', fsPath.resolve(rootDir, '../logs')],
    [fsPath.resolve(rootDir, './logs/foo'), fsPath.resolve(rootDir, './logs/foo')],
    ['./logs/foo', fsPath.resolve(rootDir, './logs/foo')],
    ['.', rootDir],
  ].forEach(([logDir_, exp = '']) => {
    // eslint-disable-next-line no-undef
    const expected = normalizePath(exp);
    test(`logDir ${logDir_} --> ${expected}`, async () => {
      loggerSettings.logDir = logDir_;
      const res = getAFLogger(loggerSettings);
      expect(res.fileLogger.logDir).toEqual(expected);
    }, TIMEOUT_MILLIS);
  });
});
