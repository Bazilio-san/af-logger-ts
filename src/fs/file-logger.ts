/* eslint-disable no-console,no-control-regex */
// noinspection JSUnusedGlobalSymbols

import * as appRoot from 'app-root-path';
import * as fse from 'fs-extra';
import * as fsPath from 'path';

import 'winston-daily-rotate-file';
import * as winston from 'winston';
import { ILogObj, ILogObjMeta } from 'tslog';
import { reduceAnyError } from '../utils';
import { IFileLogger, IFileLoggerConstructorOptions, logLevels, TFileLoggerMap, TFileLogLevel, TLogLevelName } from '../interfaces';
import { normalizePath, removeEmptyLogs } from './fs-utils';

const DEFAULT_LOG_DIR = fsPath.resolve(appRoot.path, '../logs');

const getFileLoggerActiveLevels = (fileLoggerMap: TFileLoggerMap | undefined, fileLogLevel: TFileLogLevel) => {
  // For a given type of file logger, we get a list of active logging levels
  let fileLoggerActiveLevels: TLogLevelName[] = [];
  if (fileLoggerMap) {
    // For a given type of file logger, we get a list of active logging levels
    fileLoggerActiveLevels = Object.entries(fileLoggerMap as TFileLoggerMap)
      .filter(([, fileLevel]) => fileLevel === fileLogLevel)
      .map(([logLevelName]) => logLevelName as TLogLevelName)
      .filter((logLevelName) => logLevels.includes(logLevelName));
  }

  if (!fileLoggerActiveLevels.length) {
    console.log(`WARNING: When creating a FileLogger instance, the fileLoggerMap parameter does not contain maps for "${fileLogLevel}" logger. "${fileLogLevel}" file logger won't work.`);
  }
  return fileLoggerActiveLevels;
};

/**
 * Returns a file logger of the specified type (info|error)
 * The logger is created in accordance with the specified settings and has a number of additional properties
 */
const getFSLogger = (options: IFileLoggerConstructorOptions, fileLogLevel: TFileLogLevel): IFileLogger => {
  const { filePrefix, logDir } = options;
  const fileLoggerActiveLevels: TLogLevelName[] = getFileLoggerActiveLevels(options.fileLoggerMap, fileLogLevel);
  const isError = fileLogLevel === 'error';

  const minLogSize = (isError ? options.minErrorLogSize : 0) || options.minLogSize || 0;
  const dir = logDir + (isError ? '/error' : '');
  const errorFilePrefix = isError ? 'error-' : '';

  fse.mkdirpSync(dir);

  const fileRe = new RegExp(`^${errorFilePrefix}${filePrefix}-([\\d-]{10})\\.log$`);

  const transport = new (winston.transports.DailyRotateFile)({
    level: fileLogLevel,
    json: false,
    datePattern: 'YYYY-MM-DD',
    filename: `${dir}/${errorFilePrefix}${filePrefix}-%DATE%.log`,
    maxSize: '20m',
    // maxFiles: '14d'
    // zippedArchive: true,
  });

  ['rotate', 'new'].forEach((eventName) => {
    transport.on(eventName, (...payload) => {
      options.emitter?.emit(`${fileLogLevel}-log-${eventName}`, { payload });
      removeEmptyLogs(dir, fileRe, minLogSize);
    });
  });

  const winstonLogger = winston.createLogger({
    transports: [transport],
    format: winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf((info) => `${info.timestamp}: ${info.message}`),
    ),
  }) as unknown as IFileLogger;
  const p = winstonLogger._readableState.pipes;
  winstonLogger.transport = transport;
  winstonLogger.minLogSize = minLogSize;
  winstonLogger.dir = dir;
  winstonLogger.removeEmptyLogs = removeEmptyLogs.bind(null, dir, fileRe, minLogSize);
  winstonLogger._where = `${p.dirname}/${p.filename}`;

  winstonLogger.removeEmptyLogs();

  const fileLoggerActiveLevelsIds = fileLoggerActiveLevels.map((l) => logLevels.indexOf(l));

  function main (logObjWithMeta: ILogObj & ILogObjMeta) {
    const { logLevelId } = logObjWithMeta._meta;
    if (!fileLoggerActiveLevelsIds.includes(logLevelId)) {
      return;
    }
    let message: string = '';
    if (Array.isArray(logObjWithMeta?.argumentsArray)) {
      message = logObjWithMeta.argumentsArray
        .filter((v: any) => v != null && v !== '')
        .map((v: any) => (typeof v === 'string' ? v : JSON.stringify(reduceAnyError(v), undefined, 2)).replace(/\x1b\[[\d;]+m/ig, ''))
        .join(' ');
    }
    if (message) {
      winstonLogger[fileLogLevel](message);
    }
    return logObjWithMeta;
  }

  winstonLogger.main = main.bind(winstonLogger);

  return winstonLogger;
};

const fooLogger = { main: () => undefined } as unknown as IFileLogger;

export class FileLogger {
  // @ts-ignore
  infoFileLogger: IFileLogger;

  // @ts-ignore
  errorFileLogger: IFileLogger;

  loggerFinish: (_exitCode?: number) => void;

  logDir: string;

  constructor (options: IFileLoggerConstructorOptions) {
    options.logDir = normalizePath(options.logDir || DEFAULT_LOG_DIR);
    this.logDir = options.logDir;

    const { fileLoggerMap } = options;
    if (!fileLoggerMap || !Object.keys(fileLoggerMap).length) {
      console.log(`WARNING: When creating a FileLogger instance, the fileLoggerMap parameter was not passed or empty. File logger won't work.`);
      this.infoFileLogger = fooLogger;
      this.errorFileLogger = fooLogger;
      this.loggerFinish = (exitCode) => {
        process.exit(exitCode);
      };
      return;
    }

    this.infoFileLogger = getFSLogger(options, 'info');
    this.errorFileLogger = getFSLogger(options, 'error');

    this.loggerFinish = (exitCode = 0) => {
      this.infoFileLogger.transport.on('finish', () => {
        this.errorFileLogger.transport.on('finish', () => {
          process.exit(exitCode);
        });
        this.errorFileLogger.transport.close?.();
      });
      this.infoFileLogger.transport.close?.();
    };
  }
}
