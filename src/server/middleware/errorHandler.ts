import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = err.message || 'Internal server error';
  const status = message.includes('not found') ? 404 : 500;
  res.status(status).json({ error: message });
}
