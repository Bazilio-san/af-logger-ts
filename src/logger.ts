/* istanbul ignore file */
// noinspection JSUnusedGlobalSymbols

import { ILogObj, ISettingsParam, Logger } from 'tslog';
import { FileLogger } from './fs/file-logger';
import { IFileLoggerConstructorOptions, ILoggerSettings, TErr } from './interfaces';
import { mergeStyles, reduceAnyError } from './utils';
import { getColorFn } from './trace-utils';

const defaultLogObject: ILogObj = { };

export const getAFLogger = (loggerSettings: ILoggerSettings) => {
  const settings = {
    ...loggerSettings,
    name: loggerSettings.name || 'log',
    type: 'pretty',
    colorizePrettyLogs: true,
    prettyLogTemplate: loggerSettings.prettyLogTemplate || '{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t',
    prettyErrorTemplate: loggerSettings.prettyErrorTemplate || '{{errorName}} {{errorMessage}}\n{{errorStack}}',
    prettyErrorStackTemplate: loggerSettings.prettyErrorStackTemplate || '    at {{method}} ({{filePathWithLine}})',
    stylePrettyLogs: true,
    prettyLogTimeZone: 'UTC',
    prettyLogStyles: mergeStyles(loggerSettings.prettyLogStyles),
  } as ISettingsParam<ILogObj>;

  const logger = new Logger(settings, defaultLogObject);

  // Добавление traceId из asyncLocalStorage в лог
  const logFuncArr = ['error', 'warn', 'silly', 'debug', 'info', 'trace'];
  logFuncArr.forEach((item) => {
    const loggerObj = logger as unknown as { [key: string]: Function };
    const fn = loggerObj[item];
    loggerObj[item] = ((...args: string[]) => {
      const store = loggerSettings.asyncLocalStorage?.getStore();
      const traceId = store?.traceId;
      if (traceId) {
        const colorFn = getColorFn(traceId);
        const traceString = colorFn ? colorFn(`[${traceId}]`) : `[${traceId}]`;
        args = args.map((v) => `${traceString} - ${v}`);
      }
      return fn.apply(logger, args);
    }) as Function;
  });

  const fnError = logger.error;
  logger.error = (...args) => {
    args = args.map((v) => reduceAnyError(v));
    return fnError.apply(logger, args);
  };

  // ============================ file logger ====================================
  const { filePrefix, logDir, minLogSize, minErrorLogSize } = loggerSettings;

  const fileLoggerConstructorOptions: IFileLoggerConstructorOptions = {
    filePrefix: filePrefix || settings.name,
    logDir,
    minLogSize,
    minErrorLogSize,
    emitter: loggerSettings.emitter,
    fileLoggerMap: loggerSettings.fileLoggerMap,
  };

  const fileLogger = new FileLogger(fileLoggerConstructorOptions);

  logger.attachTransport(fileLogger.infoFileLogger.main);
  logger.attachTransport(fileLogger.errorFileLogger.main);

  return {
    logger,
    fileLogger,
    exitOnError: (err: TErr) => {
      if (!(err instanceof Error)) {
        err = new Error(err);
      }
      // eslint-disable-next-line no-console
      console.log(err);
      process.exit(1);
    },
  };
};
