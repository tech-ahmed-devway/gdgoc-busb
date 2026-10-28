export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler({ code, error, set }: { code: string; error: any; set: any }) {
  if (error instanceof AppError) {
    set.status = error.statusCode;
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  // Handle Elysia validation errors
  if (code === 'VALIDATION') {
    set.status = 422;
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or query parameters',
        details: error.all ? error.all : error.message,
      },
    };
  }

  // Handle Not Found
  if (code === 'NOT_FOUND') {
    set.status = 404;
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: error.message || 'Resource not found',
      },
    };
  }

  // Generic 500 error - never leak stack traces in production
  console.error('Unhandled server error:', error);
  set.status = 500;
  return {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred. Please try again later.',
    },
  };
}

