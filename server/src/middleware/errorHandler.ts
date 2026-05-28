import type { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err.message, err.stack);
  }

  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
  });
};
