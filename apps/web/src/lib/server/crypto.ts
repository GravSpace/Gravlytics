import crypto from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'gravlytics-super-secure-jwt-secret-change-in-prod';

export interface JWTPayload {
	userId: string;
	email: string;
	name: string;
	exp?: number;
	iat?: number;
}

// ── Password Hashing (scrypt + salt) ──
export function hashPassword(password: string): string {
	const salt = crypto.randomBytes(16).toString('hex');
	const hash = crypto.scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
	try {
		const [salt, hash] = storedHash.split(':');
		if (!salt || !hash) return false;
		const verify = crypto.scryptSync(password, salt, 64).toString('hex');
		return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
	} catch {
		return false;
	}
}

// ── JWT Sign & Verify ──
function base64UrlEncode(str: string): string {
	return Buffer.from(str)
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
	str = str.replace(/-/g, '+').replace(/_/g, '/');
	while (str.length % 4) str += '=';
	return Buffer.from(str, 'base64').toString('utf-8');
}

export function signJWT(payload: JWTPayload, expiresInSeconds = 86400 * 7): string {
	const header = { alg: 'HS256', typ: 'JWT' };
	const now = Math.floor(Date.now() / 1000);
	const completePayload: JWTPayload = {
		...payload,
		iat: now,
		exp: now + expiresInSeconds
	};

	const encodedHeader = base64UrlEncode(JSON.stringify(header));
	const encodedPayload = base64UrlEncode(JSON.stringify(completePayload));

	const signature = crypto
		.createHmac('sha256', JWT_SECRET)
		.update(`${encodedHeader}.${encodedPayload}`)
		.digest('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');

	return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJWT(token: string): JWTPayload | null {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;

		const [header, payload, signature] = parts;
		const expectedSig = crypto
			.createHmac('sha256', JWT_SECRET)
			.update(`${header}.${payload}`)
			.digest('base64')
			.replace(/=/g, '')
			.replace(/\+/g, '-')
			.replace(/\//g, '_');

		if (signature !== expectedSig) return null;

		const decodedPayload = JSON.parse(base64UrlDecode(payload)) as JWTPayload;
		const now = Math.floor(Date.now() / 1000);
		if (decodedPayload.exp && decodedPayload.exp < now) {
			return null; // Expired
		}

		return decodedPayload;
	} catch {
		return null;
	}
}

// ── API Key Generator (prefix + secret) ──
export function generateApiKey(): { key: string; prefix: string; hash: string } {
	const prefix = 'gly_' + crypto.randomBytes(4).toString('hex');
	const secret = crypto.randomBytes(24).toString('hex');
	const fullKey = `${prefix}_${secret}`;
	const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

	return {
		key: fullKey,
		prefix,
		hash
	};
}
