// Печатает готовый список именных ссылок для рассылки: «имена → полный URL».
// Запуск из папки site: `node scripts/links.mjs`
import { readFile } from 'node:fs/promises';
import config from '../astro.config.mjs';

const guests = JSON.parse(
	await readFile(new URL('../src/data/guests.json', import.meta.url), 'utf8'),
);

// Базу и домен берём из astro.config, чтобы не расходились с продом.
const origin = (config.site ?? '').replace(/\/$/, '');
const base = (config.base ?? '').replace(/\/$/, '');
const width = Math.max(...guests.map((g) => g.names.length));

for (const g of guests) {
	console.log(`${g.names.padEnd(width)}  →  ${origin}${base}/g/${g.slug}`);
}
