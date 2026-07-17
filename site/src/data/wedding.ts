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
	host: {
		/** Роль над именем: «Ведущая вечера» */
		role: string;
		name: string;
		/** Ссылка на профиль ведущей */
		url: string;
		note: string;
		/** Отдельная подсказка про сюрпризы и её ссылка-контакт */
		surprise: string;
		surpriseUrl: string;
	};
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
	/** URL функции RSVP — POST шлётся прямо на него */
	rsvpEndpoint: string;
}

/** Именной гость для персональной ссылки …/g/<slug>. Список — в guests.json. */
export interface Guest {
	/** Латиница-кебаб, без фамилий: `anna-sergey` */
	slug: string;
	/** Имена в именительном падеже, как в обращении: «Анна и Сергей» */
	names: string;
	/** Приветственное слово; заодно кодирует число (мн./ед.) */
	address: 'Дорогие' | 'Дорогая' | 'Дорогой';
	/** Обращение на «вы». Для пары (address === 'Дорогие') всегда «вы». */
	formal: boolean;
	/** Максимум человек в ответе RSVP; по умолчанию без ограничения сверху */
	maxGuests?: number;
}

/** Готовые персональные тексты для гостевой страницы — без склонения имён. */
export interface Personalization {
	names: string;
	/** Hero: «Рады видеть вас, Анна и Сергей» */
	heroLine: string;
	/** Invitation: «Дорогие Анна и Сергей!» */
	greeting: string;
	lead: string;
	body: string;
}

/**
 * Собирает персональные тексты из полей гостя. Единственный источник склонений
 * ты/вы и ед./мн. — поля `address` и `formal`, никаких догадок по строке имён.
 */
export function personalize(guest: Guest): Personalization {
	// Пара — всегда «вы»; для одного гостя число берём из formal.
	const plural = guest.address === 'Дорогие';
	const formal = plural || guest.formal;
	const you = formal ? 'вас' : 'тебя';
	const withYou = formal ? 'с вами' : 'с тобой';
	const come = formal ? 'приезжайте' : 'приезжай';
	const your = formal ? 'ваше' : 'твоё';
	return {
		names: guest.names,
		heroLine: `Рады видеть ${you}, ${guest.names}`,
		greeting: `${guest.address} ${guest.names}!`,
		lead: `Мы будем счастливы разделить ${withYou} один из самых важных дней нашей жизни.`,
		body: `В этот день мы станем семьёй и хотим, чтобы рядом были самые близкие люди. Будет тёплый вечер, добрые слова и танцы до ночи — ${come}, ${your} присутствие для нас бесценно.`,
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
		lead: 'Мы будем счастливы разделить с вами один из самых важных дней нашей жизни.',
		body: 'В этот день мы станем семьёй и хотим, чтобы рядом были самые близкие люди. Будет тёплый вечер, добрые слова и танцы до ночи — приезжайте, ваше присутствие для нас бесценно.',
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
		{ time: '21:00', title: 'Открытие танцпола', note: 'Танцуем до самой ночи' },
	],
	host: {
		role: 'Ведущая вечера',
		name: 'Наталья',
		url: 'https://vk.ru/natalya_lobanova_arhappy',
		note: 'Подарит вечеру настроение, соберёт всех вместе и проведёт нас через каждый важный момент дня.',
		surprise:
			'Готовите сюрприз или необычное поздравление? Напишите Наталье заранее — она подскажет удобное время и поможет всё устроить.',
		surpriseUrl: 'https://vk.ru/natalya_lobanova_arhappy',
	},
	dressCode: {
		text: 'Ждём вас в элегантных образах! Убедительная просьба к дамам: пожалуйста, избегайте оттенков белого, молочного и шампань — оставим их для невесты.',
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
		telegram: '@elgrudina394',
		telegramUrl: 'https://t.me/elgrudina394',
	},
	rsvpEndpoint: 'https://functions.yandexcloud.net/d4egfb5ct1gpd2kgnudl',
};
