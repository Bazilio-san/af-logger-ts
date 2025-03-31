/* eslint-disable no-console,no-control-regex */
// noinspection JSUnusedGlobalSymbols

import * as appRoot from 'app-root-path';
import * as fse from 'fs-extra';
import * as fsPath from 'path';

import 'winston-daily-rotate-file';
import * as winston from 'winston';
import { ILogObj, ILogObjMeta } from 'tslog';
import { reduceAnyError } from '../utils';
import { IFileLogger, IFileLoggerConstructorOptions, TFileLogLevel } from '../interfaces';
import { normalizePath, removeEmptyLogs } from './fs-utils';

const DEFAULT_LOG_DIR = fsPath.resolve(appRoot.path, '../logs');
/**
 * Returns a file logger of the specified type (info|error)
 * The logger is created in accordance with the specified settings and has a number of additional properties
 */
const getFSLogger = (options: IFileLoggerConstructorOptions, fileLogLevel: TFileLogLevel): IFileLogger => {
  const { filePrefix, logDir, maxSize } = options;
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
    maxSize: maxSize || '20m',
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
      winston.format.timestamp({ format: 'YYYY-MM-DD-HH:mm:ss.sss' }),
      winston.format.printf((info) => `${info.timestamp}  ${info.level.toUpperCase()}  ${info.message}`),
    ),
  }) as unknown as IFileLogger;
  const p = winstonLogger._readableState.pipes;
  winstonLogger.transport = transport;
  winstonLogger.minLogSize = minLogSize;
  winstonLogger.dir = dir;
  winstonLogger.removeEmptyLogs = removeEmptyLogs.bind(null, dir, fileRe, minLogSize);
  winstonLogger._where = `${p.dirname}/${p.filename}`;

  winstonLogger.removeEmptyLogs();
  function main (logObjWithMeta: ILogObj & ILogObjMeta) {
    const { logLevelName } = logObjWithMeta._meta;
    const messages: string[] = [];
    if (logObjWithMeta['0']) {
      const keys = Object.keys(logObjWithMeta).filter((k) => /\d/.test(String(k)));
      if (keys.length) {
        keys.forEach((k) => {
          const v: any = logObjWithMeta[k];
          if (v != null && v !== '') {
            if (typeof v === 'string') {
              messages.push(v);
            } else {
              messages.push(JSON.stringify(reduceAnyError(v, true), undefined, 2));
            }
          }
        });
      }
    } else if (logObjWithMeta.nativeError) {
      messages.push(JSON.stringify(reduceAnyError(logObjWithMeta.nativeError, true), undefined, 2));
    } else if (['stack', 'message', 'code', 'name'].some((v) => logObjWithMeta[v])) {
      messages.push(JSON.stringify(reduceAnyError(logObjWithMeta, true), undefined, 2));
    } else {
      messages.push(JSON.stringify(logObjWithMeta, undefined, 2));
    }

    const message = messages
      .map((v) => v.replace(/\x1b\[[\d;]+m/ig, '').trim())
      .filter(Boolean)
      .join(' ').trim();
    if (message) {
      winstonLogger[logLevelName.toLowerCase() as unknown as TFileLogLevel](message);
    }
    return logObjWithMeta;
  }

  winstonLogger.main = main.bind(winstonLogger);

  return winstonLogger;
};

export class FileLogger {
  infoFileLogger: IFileLogger;

  errorFileLogger: IFileLogger;

  loggerFinish: (_exitCode?: number) => void;

  logDir: string;

  constructor (options: IFileLoggerConstructorOptions) {
    options.logDir = normalizePath(options.logDir || DEFAULT_LOG_DIR);
    this.logDir = options.logDir;

    this.infoFileLogger = getFSLogger(options, options?.level ?? 'info');
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
