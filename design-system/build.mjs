// Сборка самодостаточных превью: инлайнит шрифты (data-URI) и общие токены
// из src/*.html в корень design-system/. Запуск: node design-system/build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(root, '..', 'site', 'node_modules', '@fontsource-variable');

// Берём только latin + cyrillic сабсеты (без -ext и vietnamese)
const KEEP = /-(latin|cyrillic)-wght-(normal|italic)\.woff2/;

function fontFaces(pkg, cssFile) {
	const pkgDir = join(fontsDir, pkg);
	const css = readFileSync(join(pkgDir, cssFile), 'utf8');
	const blocks = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
	return blocks
		.filter((b) => {
			const m = b.match(/url\(\.\/files\/([^)]+\.woff2)\)/);
			return m && KEEP.test(m[1]);
		})
		.map((b) =>
			b.replace(/url\(\.\/files\/([^)]+\.woff2)\)/, (_, file) => {
				const data = readFileSync(join(pkgDir, 'files', file)).toString('base64');
				return `url(data:font/woff2;base64,${data})`;
			}),
		)
		.join('\n');
}

const fontsCss = [
	fontFaces('cormorant', 'wght.css'),
	fontFaces('cormorant', 'wght-italic.css'),
	fontFaces('manrope', 'wght.css'),
].join('\n');

const sharedCss = readFileSync(join(root, 'src', 'shared.css'), 'utf8');
const sharedBlock = `<style>\n${fontsCss}\n${sharedCss}</style>`;

for (const file of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.html'))) {
	const html = readFileSync(join(root, 'src', file), 'utf8');
	if (!html.includes('<!-- @shared -->')) throw new Error(`${file}: нет маркера <!-- @shared -->`);
	writeFileSync(join(root, file), html.replace('<!-- @shared -->', sharedBlock));
	console.log('built', file);
}
