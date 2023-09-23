import * as config from 'config';
import * as fse from 'fs-extra';
import * as fsPath from 'path';
import { ILoggerSettings } from '../src/interfaces';
import em from './ee';
import { getAFLogger } from '../src';
import { normalizePath } from '../src/utils';

const { level: minLevel, prefix } = config.get('logger');
const logDir = './_log';
fse.removeSync(logDir);

const loggerSettings: ILoggerSettings = {
  minLevel,
  name: prefix,
  filePrefix: prefix,
  logDir,
  minLogSize: 0,
  minErrorLogSize: 0,
  // displayLoggerName: true,
  // displayFunctionName: true,
  // displayFilePath: 'displayAll',
  emitter: em,
  fileLoggerMap: {
    silly: 'info',
    info: 'info',
    error: 'error',
    fatal: 'error',
  },
};

const { logger, echo, color /* fileLogger, exitOnError */ } = getAFLogger(loggerSettings);

const rootDir = process.cwd();

const TIMEOUT_MILLIS = 100_000;

describe('Test logger', () => {
  test('logger', async () => {
    logger.silly('write silly');
    logger.debug('write debug');
    logger.trace('write trace');
    logger.info('write info');
    logger.warn('write warn');
    logger.error('write error');
    logger.fatal('write fatal');
    logger._.silly('write silly_');
    logger._.debug('write debug_');
    logger._.trace('write trace_');
    logger._.info('write info_');
    logger._.warn('write warn_');
    logger._.error('write error_');
    logger._.fatal('write fatal_');
  }, TIMEOUT_MILLIS);

  [
    [undefined, fsPath.resolve(rootDir, '../logs')],
    ['', fsPath.resolve(rootDir, '../logs')],
    [fsPath.resolve(rootDir, './logs/foo'), fsPath.resolve(rootDir, './logs/foo')],
    ['./logs/foo', fsPath.resolve(rootDir, './logs/foo')],
    ['.', rootDir],
  ].forEach(([logDir_, exp = '']) => {
    const expected = normalizePath(exp);
    test(`logDir ${logDir_} --> ${expected}`, async () => {
      loggerSettings.logDir = logDir_;
      const res = getAFLogger(loggerSettings);
      expect(res.fileLogger.logDir).toEqual(expected);
    }, TIMEOUT_MILLIS);
  });

  test('echo', async () => {
    echo.silly('echo silly');
    echo.debug('echo debug');
    echo.trace('echo trace');
    echo.info('echo info');
    echo.warn('echo warn');
    echo.error('echo error');
  }, TIMEOUT_MILLIS);

  test('color', async () => {
    echo.silly(`COLOR: ${color.red}RED`);
  }, TIMEOUT_MILLIS);

  test('echo as function', async () => {
    echo('ECHO AS FUNCTION IS OK');
  }, TIMEOUT_MILLIS);
});
