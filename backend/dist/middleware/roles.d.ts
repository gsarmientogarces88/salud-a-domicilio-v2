import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
export declare const authorize: (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
