import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../lib/prisma';

interface JwtPayload {
  userId: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'Token requerido' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isBanned: true },
    });

    if (!user) {
      return res.status(401).json({ error: true, message: 'Usuario no existe' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: true, message: 'Usuario baneado' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: true, message: 'Token inválido o expirado' });
  }
};
