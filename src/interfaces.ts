import EventEmitter from 'events';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ILogObj, ILogObjMeta, ISettingsParam } from 'tslog';

export type TMethod<T> = (..._args: any[]) => T;
export type TErr = Error | any;
export type Maybe<T> = T | undefined;
export type Nullable<T> = T | null;

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

export const logLevels: TLogLevelName[] = ['silly', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'];

export const logLevelIdByName = (logLevelName: TLogLevelName): TLogLevelId => {
  const foundLevelId = logLevels.indexOf(logLevelName);
  return (foundLevelId === -1 ? 3 : foundLevelId) as TLogLevelId;
};

export type TFileLogLevel = 'info' | 'error'

export type TFileLoggerMap = {
  [_key in TLogLevelName]?: TFileLogLevel
}

export interface IFileLoggerConstructorOptions {
  filePrefix?: string,
  logDir?: string,
  minLogSize?: number, // Files smaller than this size will be deleted during rotation. Default = 0
  minErrorLogSize?: number, // Files smaller than this size will be deleted during rotation. Default = minLogSize | 0
  emitter?: EventEmitter,
  fileLoggerMap?: TFileLoggerMap,
}

export interface ILoggerSettings extends IFileLoggerConstructorOptions, ISettingsParam<ILogObj> {
  name?: string,
}

export interface IFileLogger extends winston.Logger {
  main: (_args: ILogObj & ILogObjMeta) => (ILogObj & ILogObjMeta) | undefined,
  minLogSize: number,
  dir: string,
  removeEmptyLogs: TMethod<void>,
  transport: DailyRotateFile,
  _readableState?: any,
  _where?: string,
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
