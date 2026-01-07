import type { Express, Request, Response, NextFunction } from "express";

export async function setupAuth(app: Express): Promise<void> {
  // No-op for Community Edition
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  next();
}
