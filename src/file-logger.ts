/* eslint-disable no-console */
// noinspection JSUnusedGlobalSymbols

import * as appRoot from 'app-root-path';
import * as fse from 'fs-extra';
import * as fsPath from 'path';

import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { ILogObj } from 'tslog';
import { normalizePath, reduceAnyError, removeEmptyLogs } from './utils';
import { IFileLogger, ILoggerSettings } from './interfaces';

const DEFAULT_LOG_DIR = fsPath.resolve(appRoot.path, '../logs');

const getSLogger = (options: ILoggerSettings, contName: string): IFileLogger => {
  const { filePrefix, logDir } = options;
  const isError = contName === 'error';
  const minLogSize = (isError ? options.minErrorLogSize : 0) || options.minLogSize || 0;
  const dir = logDir + (isError ? '/error' : '');
  const errorFilePrefix = isError ? 'error-' : '';

  fse.mkdirpSync(dir);

  const fileRe = new RegExp(`^${errorFilePrefix}${filePrefix}-([\\d-]{10})\\.log$`);

  const transport = new (winston.transports.DailyRotateFile)({
    level: contName,
    json: false,
    datePattern: 'YYYY-MM-DD',
    filename: `${dir}/${errorFilePrefix}${filePrefix}-%DATE%.log`,
    maxSize: '20m',
    // maxFiles: '14d'
    // zippedArchive: true,
  });

  ['rotate', 'new'].forEach((eventName) => {
    transport.on(eventName, (...payload) => {
      options.emitter?.emit(`${contName}-log-${eventName}`, { payload });
      removeEmptyLogs(dir, fileRe, minLogSize);
    });
  });

  const logger = winston.createLogger({
    transports: [transport],
    format: winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf((info) => `${info.timestamp}: ${info.message}`),
    ),
  }) as IFileLogger;
  const p = logger._readableState.pipes;
  logger.transport = transport;
  logger.minLogSize = minLogSize;
  logger.dir = dir;
  logger.removeEmptyLogs = removeEmptyLogs.bind(null, dir, fileRe, minLogSize);
  logger._where = `${p.dirname}/${p.filename}`;

  logger.removeEmptyLogs();

  function main (logObject: ILogObj) {
    let message: string = '';
    if (Array.isArray(logObject?.argumentsArray)) {
      message = logObject.argumentsArray
        .filter((v: any) => v != null && v !== '')
        // eslint-disable-next-line no-control-regex
        .map((v: any) => (typeof v === 'string' ? v : JSON.stringify(reduceAnyError(v), undefined, 2)).replace(/\x1b\[[\d;]+m/ig, '')).join(' ');
    }
    if (message) {
      logger[contName](message);
    }
    return logObject;
  }

  logger.main = main.bind(logger);

  return logger;
};

export class FileLogger {
  info: IFileLogger;

  error: IFileLogger;

  loggerFinish: (exitCode?: number) => void;

  logDir: string;

  constructor (options: ILoggerSettings) {
    options.logDir = normalizePath(options.logDir || DEFAULT_LOG_DIR);
    this.logDir = options.logDir;

    this.info = getSLogger(options, 'info');
    this.error = getSLogger(options, 'error');

    this.loggerFinish = (exitCode = 0) => {
      this.info.transport.on('finish', () => {
        this.error.transport.on('finish', () => {
          process.exit(exitCode);
        });
        this.error.transport.close?.();
      });
      this.info.transport.close?.();
    };
  }
}
