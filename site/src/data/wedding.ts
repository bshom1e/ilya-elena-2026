// Единственный источник данных свадьбы. Компоненты ничего не хардкодят —
// только читают отсюда. Меняем факты здесь, вёрстку не трогаем.

export interface ScheduleItem {
	/** Время в формате ЧЧ:ММ */
	time: string;
	title: string;
	note: string;
}

export interface PaletteColor {
	name: string;
	/** hex для кружка палитры */
	hex: string;
}

export interface Wedding {
	couple: {
		groom: string;
		bride: string;
	};
	/** Момент сбора гостей с таймзоной — точка отсчёта для таймера */
	dateISO: string;
	/** Готовые подписи, чтобы форматирование не жило в компонентах */
	dateLabel: string;
	dateLabelLong: string;
	gatheringLabel: string;
	invitation: {
		lead: string;
		body: string;
	};
	venue: {
		name: string;
		city: string;
		coords: { lat: number; lng: number };
		/** Ссылка на карточку организации в Яндекс.Картах (oid) */
		mapLink: string;
		/** URL виджета-эмбеда Яндекс.Карт (без API-ключа) */
		mapEmbed: string;
	};
	schedule: ScheduleItem[];
	dressCode: {
		text: string;
		/** Оттенки, в которых ждём гостей */
		palette: PaletteColor[];
		/** Оттенки, которых просим избегать */
		avoid: PaletteColor[];
	};
	contacts: {
		telegram: string;
		telegramUrl: string;
	};
}

const coords = { lat: 64.498069, lng: 40.354858 };
const yandexOid = '139225003336';

export const wedding: Wedding = {
	couple: {
		groom: 'Илья',
		bride: 'Елена',
	},
	dateISO: '2026-08-06T16:30:00+03:00',
	dateLabel: '6 августа 2026',
	dateLabelLong: 'шестое августа две тысячи двадцать шестого',
	gatheringLabel: 'Сбор гостей в 16:30',
	invitation: {
		lead: 'Дорогие друзья! Мы будем счастливы разделить с вами один из самых важных дней нашей жизни.',
		body: 'В этот день мы станем семьёй и хотим, чтобы рядом были самые близкие люди. Будет тёплый вечер среди сосен, добрые слова и танцы до ночи — приезжайте, ваше присутствие для нас бесценно.',
	},
	venue: {
		name: 'База отдыха «Чистые пруды»',
		city: 'Архангельск',
		coords,
		mapLink: `https://yandex.ru/maps/org/${yandexOid}/`,
		mapEmbed: `https://yandex.ru/map-widget/v1/?ll=${coords.lng}%2C${coords.lat}&z=16&pt=${coords.lng}%2C${coords.lat}%2Cpm2rdm`,
	},
	schedule: [
		{ time: '16:30', title: 'Сбор гостей', note: 'Встреча и лёгкий фуршет на свежем воздухе' },
		{ time: '17:00', title: 'Церемония', note: 'Самый трогательный момент дня' },
		{ time: '17:30', title: 'Банкет', note: 'Праздничный ужин, тосты и поздравления' },
		{ time: '22:00', title: 'Открытие танцпола', note: 'Танцуем до самой ночи' },
	],
	dressCode: {
		text: 'Ждём вас в элегантных образах! Убедительная просьба к дамам: пожалуйста, избегайте белого, молочного и шампанского — оставим эти оттенки для невесты.',
		palette: [
			{ name: 'Беж', hex: '#c9b8a3' },
			{ name: 'Терракот', hex: '#b08d7a' },
			{ name: 'Оливка', hex: '#a3a58f' },
			{ name: 'Серо-голубой', hex: '#8f9bab' },
			{ name: 'Какао', hex: '#6b5d52' },
		],
		avoid: [
			{ name: 'Белый', hex: '#fffdf8' },
			{ name: 'Молочный', hex: '#f4ecdd' },
			{ name: 'Шампань', hex: '#efe2c6' },
		],
	},
	contacts: {
		telegram: '@hom1ee',
		telegramUrl: 'https://t.me/hom1ee',
	},
};
