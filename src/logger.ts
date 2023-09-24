/* istanbul ignore file */
// noinspection JSUnusedGlobalSymbols

import { AsyncLocalStorage } from 'async_hooks';
import { ILogObj, ISettingsParam, Logger } from 'tslog';
import { FileLogger } from './fs/file-logger';
import { IFileLoggerConstructorOptions, ILoggerSettings, TErr } from './interfaces';
import { mergeStyles, reduceAnyError } from './utils';

const asyncLocalStorage: AsyncLocalStorage<{ requestId: string }> = new AsyncLocalStorage();
const defaultLogObject: ILogObj = { requestId: () => asyncLocalStorage.getStore()?.requestId };

export const getAFLogger = (loggerSettings: ILoggerSettings) => {
  const settings = {
    ...loggerSettings,
    name: loggerSettings.name || 'log',
    prettyLogTemplate: loggerSettings.prettyLogTemplate || '{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t',
    prettyErrorTemplate: loggerSettings.prettyErrorTemplate || '{{errorName}} {{errorMessage}}\n{{errorStack}}',
    prettyErrorStackTemplate: loggerSettings.prettyErrorStackTemplate || '    at {{method}} ({{filePathWithLine}})',
    stylePrettyLogs: true,
    prettyLogTimeZone: 'UTC',
    prettyLogStyles: mergeStyles(loggerSettings.prettyLogStyles),
  } as ISettingsParam<ILogObj>;

  const logger = new Logger(settings, defaultLogObject);

  const fnError = logger.error;

  logger.error = (...args) => {
    if (args[0]) {
      args[0] = reduceAnyError(args[0]);
    }
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
