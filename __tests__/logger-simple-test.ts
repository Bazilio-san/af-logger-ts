import * as config from 'config';
import * as fse from 'fs-extra';
import em from './ee';
import { getAFLogger, ILoggerSettings, logLevelIdByName, TLogLevelName } from '../src';

const minLevelName = config.get<TLogLevelName>('logger.level');
const prefix = config.get<string>('logger.prefix');
const logDir = './_test_tmp/_log';
fse.removeSync(logDir);

const loggerSettings: ILoggerSettings = {
  minLevel: logLevelIdByName(minLevelName),
  name: prefix,
  filePrefix: prefix,
  logDir,
  minLogSize: 0,
  minErrorLogSize: 0,
  emitter: em,
  fileLoggerMap: {
    silly: 'info',
    info: 'info',
    error: 'error',
    fatal: 'error',
  },
};

const { logger } = getAFLogger(loggerSettings);

logger.silly('write silly');
logger.trace('write trace');
logger.debug('write debug');
logger.info('write info');
logger.warn('write warn');
logger.error(new Error('write error'));
logger.fatal(new Error('write error'));
console.log(new Error('write error'));
