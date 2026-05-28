import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
	user?: {
		userId: string;
		email: string;
		role: string;
	};
}

const getJwtSecret = (): string => {
	if (!process.env.JWT_SECRET) {
		throw new Error('JWT_SECRET is not configured');
	}

	return process.env.JWT_SECRET;
};

export const authenticate = (
	req: AuthRequest,
	res: Response,
	next: NextFunction
): void => {
	const tokenFromCookie = req.cookies?.token as string | undefined;
	const tokenFromHeader = req.headers.authorization?.replace('Bearer ', '');
	const token = tokenFromCookie || tokenFromHeader;

	if (!token) {
		res.status(401).json({ error: 'No token provided' });
		return;
	}

	try {
		const decoded = jwt.verify(
			token,
			getJwtSecret()
		) as {
			userId: string;
			email: string;
			role: string;
		};

		req.user = {
			userId: decoded.userId,
			email: decoded.email,
			role: decoded.role,
		};

		next();
	} catch (_error) {
		res.status(401).json({ error: 'Invalid or expired token' });
	}
};

export const authorize = (...allowedRoles: string[]) => {
	return (req: AuthRequest, res: Response, next: NextFunction): void => {
		if (!req.user) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const hasPermission = allowedRoles.includes(req.user.role);

		if (!hasPermission) {
			res.status(403).json({
				error: 'Forbidden - Insufficient permissions',
			});
			return;
		}

		next();
	};
};

export const authorizeRoles = (...roles: string[]) => {
	return (req: AuthRequest, res: Response, next: NextFunction): void => {
		if (!req.user) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		if (!roles.includes(req.user.role)) {
			res.status(403).json({ error: 'Access Denied' });
			return;
		}

		next();
	};
};
