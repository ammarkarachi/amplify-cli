import winston, { Logger, format } from 'winston';
import winstonDailyRotateFile from 'winston-daily-rotate-file';
import { constants } from './constants';
import { IAmplifyLogger } from './IAmplifyLogger';
import { getLogFilePath, getLocalLogFilePath, getLogAuditFilePath } from './getLogFilePath';
import { LocalProjectData, LogPayload, LogErrorPayload } from './Types';

export class AmplifyLogger implements IAmplifyLogger {
  logger: Logger;
  format: winston.Logform.Format;
  localProjectData!: LocalProjectData;
  disabledAmplifyLogging: boolean = !!process.env.AMPLIFY_CLI_DISABLE_LOGGING;
  constructor() {
    this.logger = winston.createLogger();
    this.format = format.combine(format.timestamp(), format.splat(), format.printf(this.formatter));
    if (!this.disabledAmplifyLogging) {
      this.logger.add(
        new winstonDailyRotateFile({
          auditFile: getLogAuditFilePath(false),
          filename: getLogFilePath(),
          datePattern: constants.DATE_PATTERN,
          maxFiles: `${constants.MAX_FILE_DAYS}d`,
          handleExceptions: false,
          format: this.format,
        }),
      );
    }
  }

  private formatter(info: winston.Logform.TransformableInfo): string {
    const format = `${info.timestamp}|${info.level} : ${info.message}`;
    if (info.level === 'info') {
      if (info.isStackEvent) return format;
      return `${format}(${info.args
        .map((arg: any) => {
          if (arg) {
            return JSON.stringify(arg).replace(/\d{12}/gm, s => 'xxxxxxxx' + s.slice(7, 11));
          } else {
            return arg;
          }
        })
        .join(',')})`;
    }

    if (info.level === 'error') {
      return `${format} \n ${info.error}`;
    }

    return '';
  }

  replaceAccountId(arg: string): string {
    return arg.replace(/\d{12}/gm, s => 'xxxxxxxx' + s.slice(7, 11));
  }

  projectLocalLogInit(projecPath: string): void {
    if (!this.disabledAmplifyLogging) {
      this.logger.add(
        new winstonDailyRotateFile({
          auditFile: getLogAuditFilePath(true),
          filename: getLocalLogFilePath(projecPath),
          datePattern: constants.DATE_PATTERN,
          maxFiles: `${constants.MAX_FILE_DAYS}d`,
          handleExceptions: false,
          format: this.format,
        }),
      );
    }
  }

  logInfo(content: LogPayload): void {
    const { module, ...others } = content;
    this.logger.info(content.module, { ...others });
  }

  logError(content: LogErrorPayload): void {
    const { module, ...others } = content;
    this.logger.error(module, { ...others });
  }

  log(message: string): void {
    this.logger.info(message);
  }
}
