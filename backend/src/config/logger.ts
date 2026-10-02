import winston from 'winston';
import { env } from './env';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: env.isDev() ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'kostkita-backend' },
  transports: [
    new winston.transports.Console({
      format: env.isDev()
        ? combine(colorize(), simple())
        : combine(timestamp(), json()),
    }),
  ],
});
