export interface Env {
	TG_BOT_TOKEN: string;
	TG_CHAT_ID: string;
}

const ALLOWED_ORIGIN = 'https://bshom1e.github.io';
const ALCOHOL_LABELS: Record<string, string> = {
	red: 'красное вино',
	white: 'белое вино',
	champagne: 'шампанское',
	strong: 'крепкие напитки',
	none: 'не пьёт',
};

interface Person {
	alcohol: string[];
	/** Аллергии этого гостя или '' */
	dietary: string;
}

interface Rsvp {
	guest: string | null;
	name: string;
	attending: boolean;
	guestsCount: number;
	/** Анкета на каждого гостя (длина === guestsCount при attending) */
	people: Person[];
	website: string;
}

function corsHeaders(origin: string | null): HeadersInit {
	const headers: Record<string, string> = {
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	};
	if (origin === ALLOWED_ORIGIN) {
		headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
	}
	return headers;
}

function json(data: unknown, status: number, origin: string | null): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
	});
}

function parseRsvp(body: unknown): Rsvp | { error: string } {
	if (typeof body !== 'object' || body === null) return { error: 'invalid_body' };
	const b = body as Record<string, unknown>;

	const website = typeof b.website === 'string' ? b.website : '';
	if (website) {
		// Честварная ловушка: поле заполнил бот — тихо отвечаем 200, не отправляя в Telegram.
		return { guest: null, name: '', attending: false, guestsCount: 0, people: [], website };
	}

	const guest = b.guest === null || b.guest === undefined ? null : b.guest;
	if (guest !== null && (typeof guest !== 'string' || !/^[a-z0-9-]{1,64}$/.test(guest))) {
		return { error: 'invalid_guest' };
	}

	if (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 200) {
		return { error: 'invalid_name' };
	}

	if (typeof b.attending !== 'boolean') {
		return { error: 'invalid_attending' };
	}

	if (typeof b.guestsCount !== 'number' || !Number.isInteger(b.guestsCount) || b.guestsCount < 1 || b.guestsCount > 20) {
		return { error: 'invalid_guests_count' };
	}

	// Напитки — на каждого гостя. При отказе список не важен.
	let people: Person[] = [];
	if (b.attending) {
		if (!Array.isArray(b.people) || b.people.length !== b.guestsCount) {
			return { error: 'invalid_people' };
		}
		for (const p of b.people) {
			if (typeof p !== 'object' || p === null) return { error: 'invalid_people' };
			const alcohol = (p as Record<string, unknown>).alcohol;
			if (!Array.isArray(alcohol) || !alcohol.every((a) => typeof a === 'string' && a in ALCOHOL_LABELS)) {
				return { error: 'invalid_people' };
			}
			const dietary = (p as Record<string, unknown>).dietary;
			if (typeof dietary !== 'string' || dietary.length > 500) {
				return { error: 'invalid_people' };
			}
			people.push({ alcohol: alcohol as string[], dietary: dietary.trim() });
		}
	}

	return {
		guest,
		name: b.name.trim(),
		attending: b.attending,
		guestsCount: b.guestsCount,
		people,
		website,
	};
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMessage(r: Rsvp): string {
	const lines = ['<b>Новый ответ RSVP</b>', `Имя: ${escapeHtml(r.name)}`];
	if (r.guest) lines.push(`Гость: ${escapeHtml(r.guest)}`);
	lines.push(`Статус: ${r.attending ? '✅ придёт' : '❌ не сможет'}`);
	if (r.attending) {
		lines.push(`Гостей: ${r.guestsCount}`);
		const drinks = (p: Person): string => (p.alcohol.length ? p.alcohol.map((a) => ALCOHOL_LABELS[a] ?? a).join(', ') : '—');
		if (r.people.length === 1) {
			const p = r.people[0];
			if (p.alcohol.length) lines.push(`Напитки: ${drinks(p)}`);
			if (p.dietary) lines.push(`Аллергии: ${escapeHtml(p.dietary)}`);
		} else if (r.people.length > 1) {
			lines.push('Гости:');
			r.people.forEach((p, i) => {
				const diet = p.dietary ? `; аллергии: ${escapeHtml(p.dietary)}` : '';
				lines.push(`  • Гость ${i + 1}: ${drinks(p)}${diet}`);
			});
		}
	}
	return lines.join('\n');
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = request.headers.get('Origin');
		const url = new URL(request.url);

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders(origin) });
		}

		if (url.pathname !== '/rsvp' || request.method !== 'POST') {
			return json({ ok: false, error: 'not_found' }, 404, origin);
		}

		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return json({ ok: false, error: 'invalid_json' }, 400, origin);
		}

		const parsed = parseRsvp(body);
		if ('error' in parsed) {
			return json({ ok: false, error: parsed.error }, 400, origin);
		}

		if (parsed.website) {
			return json({ ok: true }, 200, origin);
		}

		const chatIds = env.TG_CHAT_ID.split(',').map((id) => id.trim()).filter(Boolean);
		const text = renderMessage(parsed);
		const results = await Promise.all(
			chatIds.map((chatId) =>
				fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
				}),
			),
		);

		if (!results.some((r) => r.ok)) {
			return json({ ok: false, error: 'telegram_failed' }, 502, origin);
		}

		return json({ ok: true }, 200, origin);
	},
};
