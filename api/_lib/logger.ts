import pino from 'pino';

// PII-redacting logger. Never log raw emails, document numbers, or message bodies.
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'email',
      '*.email',
      'sender',
      '*.sender',
      'document_number',
      '*.document_number',
      'body',
      '*.body',
      'question',
      '*.question',
      'imageBase64',
      '*.imageBase64',
    ],
    censor: '[redacted]',
  },
});
