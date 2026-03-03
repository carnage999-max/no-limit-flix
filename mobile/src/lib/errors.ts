export const GENERIC_ERROR_MESSAGE =
  'An unexpected error happened, please contact support or try again later';

export const getUserFacingError = (
  error: any,
  allowedMessages: string[] = [],
  fallback: string = GENERIC_ERROR_MESSAGE
) => {
  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  if (!message) return fallback;
  const lower = message.toLowerCase();
  const allowed = allowedMessages.some((allowedMessage) => lower.includes(allowedMessage.toLowerCase()));
  return allowed ? message : fallback;
};
