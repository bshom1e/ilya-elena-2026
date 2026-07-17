// Yandex Cloud Function: приём RSVP и отправка в Telegram.
// RU-хостинг — гостям доступно без VPN (в отличие от workers.dev).
// Контракт запроса совпадает с прежним воркером в ../rsvp-worker.
// Секреты — в переменных окружения функции: TG_BOT_TOKEN, TG_CHAT_ID (id через запятую).

const ALLOWED_ORIGIN = 'https://bshom1e.github.io';
const ALCOHOL_LABELS = {
	red: 'красное вино',
	white: 'белое вино',
	champagne: 'шампанское',
	strong: 'крепкие напитки',
	none: 'не пьёт',
};

function corsHeaders(origin) {
	const headers = {
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	};
	if (origin === ALLOWED_ORIGIN) headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
	return headers;
}

function json(data, status, origin) {
	return {
		statusCode: status,
		headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
		body: JSON.stringify(data),
	};
}

function escapeHtml(s) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseRsvp(body) {
	if (typeof body !== 'object' || body === null) return { error: 'invalid_body' };
	const b = body;

	const website = typeof b.website === 'string' ? b.website : '';
	if (website) {
		// Ловушка для ботов: поле заполнено — тихо отвечаем 200, ничего не отправляя.
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

	// Анкета на каждого гостя. При отказе список не важен.
	const people = [];
	if (b.attending) {
		if (!Array.isArray(b.people) || b.people.length !== b.guestsCount) {
			return { error: 'invalid_people' };
		}
		for (const p of b.people) {
			if (typeof p !== 'object' || p === null) return { error: 'invalid_people' };
			const name = p.name;
			if (typeof name !== 'string' || name.length > 200) return { error: 'invalid_people' };
			const alcohol = p.alcohol;
			if (!Array.isArray(alcohol) || !alcohol.every((a) => typeof a === 'string' && a in ALCOHOL_LABELS)) {
				return { error: 'invalid_people' };
			}
			const dietary = p.dietary;
			if (typeof dietary !== 'string' || dietary.length > 500) {
				return { error: 'invalid_people' };
			}
			people.push({ name: name.trim(), alcohol, dietary: dietary.trim() });
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

function renderMessage(r) {
	const lines = ['<b>Новый ответ RSVP</b>', `Имя: ${escapeHtml(r.name)}`];
	if (r.guest) lines.push(`Гость: ${escapeHtml(r.guest)}`);
	lines.push(`Статус: ${r.attending ? '✅ придёт' : '❌ не сможет'}`);
	if (r.attending) {
		lines.push(`Гостей: ${r.guestsCount}`);
		const drinks = (p) => (p.alcohol.length ? p.alcohol.map((a) => ALCOHOL_LABELS[a] ?? a).join(', ') : '—');
		if (r.people.length === 1) {
			const p = r.people[0];
			if (p.alcohol.length) lines.push(`Напитки: ${drinks(p)}`);
			if (p.dietary) lines.push(`Аллергии: ${escapeHtml(p.dietary)}`);
		} else if (r.people.length > 1) {
			lines.push('Гости:');
			r.people.forEach((p, i) => {
				const who = p.name ? escapeHtml(p.name) : `Гость ${i + 1}`;
				const diet = p.dietary ? `; аллергии: ${escapeHtml(p.dietary)}` : '';
				lines.push(`  • ${who}: ${drinks(p)}${diet}`);
			});
		}
	}
	return lines.join('\n');
}

module.exports.handler = async (event) => {
	const headers = event.headers || {};
	const origin = headers.Origin || headers.origin || null;
	const method = event.httpMethod || 'GET';

	if (method === 'OPTIONS') {
		return { statusCode: 204, headers: corsHeaders(origin), body: '' };
	}
	if (method !== 'POST') {
		return json({ ok: false, error: 'not_found' }, 404, origin);
	}

	let raw = event.body || '';
	if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');

	let body;
	try {
		body = JSON.parse(raw);
	} catch {
		return json({ ok: false, error: 'invalid_json' }, 400, origin);
	}

	const parsed = parseRsvp(body);
	if (parsed.error) {
		return json({ ok: false, error: parsed.error }, 400, origin);
	}
	if (parsed.website) {
		return json({ ok: true }, 200, origin);
	}

	const chatIds = String(process.env.TG_CHAT_ID || '')
		.split(/[,\s]+/) // yc не пропускает запятые в значении env — принимаем и пробел как разделитель
		.map((id) => id.trim())
		.filter(Boolean);
	const text = renderMessage(parsed);
	const results = await Promise.all(
		chatIds.map((chatId) =>
			fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
			})
		)
	);

	if (!results.some((r) => r.ok)) {
		return json({ ok: false, error: 'telegram_failed' }, 502, origin);
	}

	return json({ ok: true }, 200, origin);
};
