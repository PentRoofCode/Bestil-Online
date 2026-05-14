import type { Response } from "express";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Meta {
  pagination?: Pagination;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Meta,
): void {
  if (statusCode === 204) {
    res.status(204).end();
    return;
  }
  res.status(statusCode).json({ success: true, data, ...(meta && { meta }) });
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}
