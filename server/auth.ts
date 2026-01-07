import type { Express, Request, Response, NextFunction } from "express";

export async function setupAuth(app: Express): Promise<void> {
  // No-op for Community Edition - no authentication required
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  // Community Edition: always allow (no auth required)
  next();
}
