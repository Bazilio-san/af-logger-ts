import * as config from 'config';
import * as fse from 'fs-extra';
import em from './ee';
import { getAFLogger, ILoggerSettings, tsLogLevelIdByName, TLogLevelName } from '../src';

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
  emitter: em,
};

const { logger } = getAFLogger(loggerSettings);

logger.silly('write silly1', 'write silly2', 'write silly3');
logger.trace('write trace');
logger.debug('write debug');
logger.info('write info');
logger.warn('write warn1');
logger.error(new Error('write error'));
logger.error('eee', new Error('write error'));
logger.fatal('fatalfatalfatal', new Error('write fatal'));
logger.fatal(new Error('write fatal'));
