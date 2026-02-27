import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: true, message: 'No autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: true, message: 'Sin permisos' });
    }

    next();
  };
};
