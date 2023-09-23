/* eslint-disable @typescript-eslint/no-unused-vars */
/* istanbul ignore file */
// noinspection JSUnusedGlobalSymbols

import { AsyncLocalStorage } from 'async_hooks';
import { ILogObj, ISettingsParam, Logger } from 'tslog';
import { FileLogger } from './file-logger';
import { ILoggerSettings, logLevels, TErr } from './interfaces';
import { reduceAnyError } from './utils';

const asyncLocalStorage: AsyncLocalStorage<{ requestId: string }> = new AsyncLocalStorage();

export const getAFLogger = (loggerSettings: ILoggerSettings) => {
  const settings = {
    name: loggerSettings.name || 'log',
    displayLoggerName: false,
    displayFunctionName: false,
    displayFilePath: 'hidden',
    requestId: () => asyncLocalStorage.getStore()?.requestId,
    ...loggerSettings,
  } as ISettingsParam<ILogObj>;
  const logger = new Logger(settings);

  const fnError = logger.error;

  logger.error = (...args) => {
    if (args[0]) {
      args[0] = reduceAnyError(args[0]);
    }
    return fnError.apply(logger, args);
  };

  // ============================ file logger ====================================
  const { filePrefix, logDir, minLogSize, minErrorLogSize, fileLoggerMap } = loggerSettings;

  const fileLoggerOptions: ILoggerSettings = {
    filePrefix: filePrefix || settings.name,
    logDir,
    minLogSize,
    minErrorLogSize,
    emitter: loggerSettings.emitter,
  };
  const fileLogger = new FileLogger(fileLoggerOptions);

  ['info', 'error'].forEach((fileLoggerType) => {
    const transportLogger: any = {};
    const arr = Object.entries(fileLoggerMap || {}).filter(([, t]) => t === fileLoggerType).map(([l]) => l);
    if (arr.length) {
      logLevels.forEach((levelName) => {
        transportLogger[levelName] = arr.includes(levelName) ? fileLogger[fileLoggerType as 'info' | 'error'].main : () => undefined;
      });
      // logger.attachTransport(transportLogger, fileLoggerType === 'error' ? fileLoggerType : minLevel); // VVQ
      logger.attachTransport(transportLogger);
    }
  });

  return {
    logger,
    fileLogger,
    exitOnError: (err: TErr) => {
      if (!(err instanceof Error)) {
        err = new Error(err);
      }
      // eslint-disable-next-line no-console
      console.log(err);
      // logger.prettyError(err, true, !err[Symbol.for('noExposeCodeFrame')]); VVQ
      process.exit(1);
    },
  };
};
