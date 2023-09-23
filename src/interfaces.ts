import EventEmitter from 'events';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ILogObj, ISettingsParam } from 'tslog';

export type TMethod<T> = (..._args: any[]) => T;
export type TErr = Error | any;
export type Maybe<T> = T | undefined;
export type Nullable<T> = T | null;

export const logLevels = ['silly', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

export interface ILogLevel {
  0: 'silly';
  1: 'trace';
  2: 'debug';
  3: 'info';
  4: 'warn';
  5: 'error';
  6: 'fatal';
}

/**
 * Log level IDs (0 - 6)
 * @public
 */
export type TLogLevelId = keyof ILogLevel;

/**
 * Log level names (silly - fatal)
 * @public
 */
export type TLogLevelName = ILogLevel[TLogLevelId];

export interface ILoggerSettings extends ISettingsParam<ILogObj> {
  name?: string,
  filePrefix?: string,
  logDir?: string,
  minLogSize?: number, // Files smaller than this size will be deleted during rotation. Default = 0
  minErrorLogSize?: number, // Files smaller than this size will be deleted during rotation. Default = minLogSize | 0
  emitter?: EventEmitter,
  fileLoggerMap?: {
    [_key in TLogLevelName]?: 'info' | 'error'
  }
}

export interface IFileLogger extends winston.Logger {
  main: (_logObject: ILogObj) => ILogObj,
  minLogSize: number,
  dir: string,
  removeEmptyLogs: TMethod<void>,
  transport: DailyRotateFile,
  _readableState?: any,
  _where?: string,
}

export interface ImErrOptions {
  msg?: string,
  thr?: boolean,
  noStack?: boolean
}

export interface TEchoOptions {
  colorNum?: number,
  bgColorNum?: number,
  bold?: boolean,
  underscore?: boolean,
  reverse?: boolean,
  prefix?: string,
  consoleFunction?: 'dir' | 'log',
  logger?: any,
  estimate?: any,
  estimateReset?: boolean,
  prettyJSON?: boolean,
  linesBefore?: number,
}
