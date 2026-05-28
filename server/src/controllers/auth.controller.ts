import type { CookieOptions, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

const TOKEN_EXPIRY = '8h';
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours

const buildCookieOptions = (): CookieOptions => ({
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'strict',
	maxAge: COOKIE_MAX_AGE,
	path: '/',
});

const normalizeCredential = (value: unknown): string => {
	return typeof value === 'string' ? value.trim() : '';
};

const getJwtSecret = (): string => {
	if (!process.env.JWT_SECRET) {
		throw new Error('JWT_SECRET is not configured');
	}

	return process.env.JWT_SECRET;
};

export const login = async (req: Request, res: Response): Promise<void> => {
	try {
		const credential = normalizeCredential(req.body.userId ?? req.body.email);
		const password = normalizeCredential(req.body.password);

		if (!credential || !password) {
			res.status(400).json({
				error: 'userId or email and password are required.',
			});
			return;
		}

		const user = await prisma.user.findFirst({
			where: {
				OR: [{ userId: credential }, { email: credential }],
			},
			select: {
				userId: true,
				email: true,
				password: true,
				role: true,
				isBlocked: true,
			},
		});

		if (!user) {
			res.status(404).json({ error: "User Doesn't exist" });
			return;
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);

		if (!isPasswordValid) {
			res.status(401).json({ error: 'Password is incorrect' });
			return;
		}

		if (user.isBlocked) {
			res.status(403).json({ error: 'User is Blocked' });
			return;
		}

		const isFirstLogin =
			(user as unknown as { isFirstLogin?: boolean }).isFirstLogin ?? false;

		const token = jwt.sign(
			{
				userId: user.userId,
				email: user.email,
				role: user.role,
			},
			getJwtSecret(),
			{ expiresIn: TOKEN_EXPIRY }
		);

		const cookieOptions = buildCookieOptions();

		res.cookie('token', token, cookieOptions);
		res.cookie(
			'session_user',
			JSON.stringify({
				userId: user.userId,
				email: user.email,
				role: user.role,
			}),
			cookieOptions
		);

		res.status(200).json({
			message: 'Login successful',
			userId: user.userId,
			email: user.email,
			role: user.role,
			isFirstLogin,
		});
	} catch (error) {
		res.status(500).json({
			error: 'Login failed',
			detail: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};
