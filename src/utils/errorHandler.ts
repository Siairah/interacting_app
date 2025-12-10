export function sanitizeErrorMessage(error: unknown): string {
  let message = '';
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String((error as any).message);
  } else {
    return 'An error occurred. Please try again.';
  }
  
  message = message.replace(/https?:\/\/localhost[^\s]*/gi, '');
  message = message.replace(/https?:\/\/127\.0\.0\.1[^\s]*/gi, '');
  message = message.replace(/http:\/\/localhost[^\s]*/gi, '');
  message = message.replace(/http:\/\/127\.0\.0\.1[^\s]*/gi, '');
  message = message.replace(/localhost:\d+/gi, '');
  message = message.replace(/127\.0\.0\.1:\d+/gi, '');
  message = message.replace(/localhost/gi, '');
  message = message.replace(/127\.0\.0\.1/gi, '');
  message = message.replace(/ECONNREFUSED|ENOTFOUND|ETIMEDOUT/gi, '');
  message = message.replace(/Failed to fetch|NetworkError|Network request failed/gi, '');
  message = message.replace(/CORS|CORS policy/gi, '');
  message = message.replace(/at\s+.*localhost.*/gi, '');
  message = message.replace(/at\s+.*127\.0\.0\.1.*/gi, '');
  message = message.replace(/\[.*localhost.*\]/gi, '');
  message = message.replace(/\[.*127\.0\.0\.1.*\]/gi, '');
  message = message.replace(/Error:\s*/gi, '');
  message = message.replace(/TypeError|ReferenceError|SyntaxError/gi, '');
  message = message.replace(/fetch.*localhost/gi, '');
  message = message.replace(/fetch.*127\.0\.0\.1/gi, '');
  message = message.replace(/XMLHttpRequest.*localhost/gi, '');
  message = message.replace(/XMLHttpRequest.*127\.0\.0\.1/gi, '');
  
  message = message.trim();
  
  if (!message || message.length === 0) {
    return 'An error occurred. Please try again.';
  }
  
  if (message.length > 100) {
    return 'An error occurred. Please try again.';
  }
  
  return message;
}

import { showToast } from '@/components/ToastContainer';

export function showError(message: string, fallback: string = 'An error occurred. Please try again.'): void {
  const sanitized = sanitizeErrorMessage(message);
  showToast(sanitized || fallback, 'error');
}

export function showSuccess(message: string): void {
  showToast(message, 'success');
}

