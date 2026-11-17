// Example cities shown next to a UTC offset in the zone picker ("UTC+1 (Praha, Berlín, Paříž)").
// Matched by each city's offset at the moment, so summer time moves the city to the right offset.
// Order = priority inside one offset (players' home countries first); at most 3 are shown.
import type { Lang } from '../i18n/strings';
import { zoneOffset } from './zone';

const CITIES: { zone: string; cs: string; en: string }[] = [
  { zone: 'Europe/Prague', cs: 'Praha', en: 'Prague' },
  { zone: 'Europe/Berlin', cs: 'Berlín', en: 'Berlin' },
  { zone: 'Europe/Paris', cs: 'Paříž', en: 'Paris' },
  { zone: 'Europe/London', cs: 'Londýn', en: 'London' },
  { zone: 'Europe/Lisbon', cs: 'Lisabon', en: 'Lisbon' },
  { zone: 'Africa/Lagos', cs: 'Lagos', en: 'Lagos' },
  { zone: 'Europe/Kyiv', cs: 'Kyjev', en: 'Kyiv' },
  { zone: 'Europe/Athens', cs: 'Atény', en: 'Athens' },
  { zone: 'Africa/Cairo', cs: 'Káhira', en: 'Cairo' },
  { zone: 'Africa/Johannesburg', cs: 'Johannesburg', en: 'Johannesburg' },
  { zone: 'Europe/Istanbul', cs: 'Istanbul', en: 'Istanbul' },
  { zone: 'Europe/Moscow', cs: 'Moskva', en: 'Moscow' },
  { zone: 'Asia/Riyadh', cs: 'Rijád', en: 'Riyadh' },
  { zone: 'Africa/Nairobi', cs: 'Nairobi', en: 'Nairobi' },
  { zone: 'Asia/Tehran', cs: 'Teherán', en: 'Tehran' },
  { zone: 'Asia/Dubai', cs: 'Dubaj', en: 'Dubai' },
  { zone: 'Asia/Baku', cs: 'Baku', en: 'Baku' },
  { zone: 'Asia/Kabul', cs: 'Kábul', en: 'Kabul' },
  { zone: 'Asia/Karachi', cs: 'Karáčí', en: 'Karachi' },
  { zone: 'Asia/Tashkent', cs: 'Taškent', en: 'Tashkent' },
  { zone: 'Asia/Kolkata', cs: 'Dillí', en: 'Delhi' },
  { zone: 'Asia/Colombo', cs: 'Kolombo', en: 'Colombo' },
  { zone: 'Asia/Kathmandu', cs: 'Káthmándú', en: 'Kathmandu' },
  { zone: 'Asia/Dhaka', cs: 'Dháka', en: 'Dhaka' },
  { zone: 'Asia/Almaty', cs: 'Almaty', en: 'Almaty' },
  { zone: 'Asia/Yangon', cs: 'Rangún', en: 'Yangon' },
  { zone: 'Asia/Bangkok', cs: 'Bangkok', en: 'Bangkok' },
  { zone: 'Asia/Jakarta', cs: 'Jakarta', en: 'Jakarta' },
  { zone: 'Asia/Ho_Chi_Minh', cs: 'Ho Či Minovo Město', en: 'Ho Chi Minh City' },
  { zone: 'Asia/Shanghai', cs: 'Peking', en: 'Beijing' },
  { zone: 'Asia/Singapore', cs: 'Singapur', en: 'Singapore' },
  { zone: 'Australia/Perth', cs: 'Perth', en: 'Perth' },
  { zone: 'Australia/Eucla', cs: 'Eucla', en: 'Eucla' },
  { zone: 'Asia/Tokyo', cs: 'Tokio', en: 'Tokyo' },
  { zone: 'Asia/Seoul', cs: 'Soul', en: 'Seoul' },
  { zone: 'Australia/Darwin', cs: 'Darwin', en: 'Darwin' },
  { zone: 'Australia/Adelaide', cs: 'Adelaide', en: 'Adelaide' },
  { zone: 'Australia/Sydney', cs: 'Sydney', en: 'Sydney' },
  { zone: 'Australia/Brisbane', cs: 'Brisbane', en: 'Brisbane' },
  { zone: 'Pacific/Port_Moresby', cs: 'Port Moresby', en: 'Port Moresby' },
  { zone: 'Australia/Lord_Howe', cs: 'Lord Howe', en: 'Lord Howe' },
  { zone: 'Pacific/Noumea', cs: 'Nouméa', en: 'Nouméa' },
  { zone: 'Asia/Vladivostok', cs: 'Vladivostok', en: 'Vladivostok' },
  { zone: 'Pacific/Auckland', cs: 'Auckland', en: 'Auckland' },
  { zone: 'Pacific/Fiji', cs: 'Fidži', en: 'Fiji' },
  { zone: 'Pacific/Chatham', cs: 'Chathamy', en: 'Chatham Islands' },
  { zone: 'Pacific/Tongatapu', cs: 'Tonga', en: 'Tonga' },
  { zone: 'Pacific/Apia', cs: 'Samoa', en: 'Samoa' },
  { zone: 'Pacific/Kiritimati', cs: 'Kiritimati', en: 'Kiritimati' },
  { zone: 'Atlantic/Azores', cs: 'Azory', en: 'Azores' },
  { zone: 'Atlantic/Cape_Verde', cs: 'Kapverdy', en: 'Cape Verde' },
  { zone: 'Atlantic/South_Georgia', cs: 'Jižní Georgie', en: 'South Georgia' },
  { zone: 'America/Sao_Paulo', cs: 'São Paulo', en: 'São Paulo' },
  { zone: 'America/Argentina/Buenos_Aires', cs: 'Buenos Aires', en: 'Buenos Aires' },
  { zone: 'America/St_Johns', cs: 'St. John’s', en: 'St. John’s' },
  { zone: 'America/Halifax', cs: 'Halifax', en: 'Halifax' },
  { zone: 'America/Santiago', cs: 'Santiago', en: 'Santiago' },
  { zone: 'America/Caracas', cs: 'Caracas', en: 'Caracas' },
  { zone: 'America/New_York', cs: 'New York', en: 'New York' },
  { zone: 'America/Toronto', cs: 'Toronto', en: 'Toronto' },
  { zone: 'America/Bogota', cs: 'Bogotá', en: 'Bogotá' },
  { zone: 'America/Chicago', cs: 'Chicago', en: 'Chicago' },
  { zone: 'America/Mexico_City', cs: 'Mexiko', en: 'Mexico City' },
  { zone: 'America/Denver', cs: 'Denver', en: 'Denver' },
  { zone: 'America/Phoenix', cs: 'Phoenix', en: 'Phoenix' },
  { zone: 'America/Los_Angeles', cs: 'Los Angeles', en: 'Los Angeles' },
  { zone: 'America/Vancouver', cs: 'Vancouver', en: 'Vancouver' },
  { zone: 'America/Anchorage', cs: 'Anchorage', en: 'Anchorage' },
  { zone: 'Pacific/Marquesas', cs: 'Markézy', en: 'Marquesas' },
  { zone: 'Pacific/Honolulu', cs: 'Honolulu', en: 'Honolulu' },
  { zone: 'Pacific/Pago_Pago', cs: 'Pago Pago', en: 'Pago Pago' },
];

/** Offset in minutes → up to 3 city names whose current offset it is. */
export function citiesByOffset(lang: Lang, at: number): Map<number, string[]> {
  const out = new Map<number, string[]>();
  for (const c of CITIES) {
    let off: number;
    try { off = zoneOffset(c.zone, at); } catch { continue; }  // zone unknown to an older browser
    const list = out.get(off) ?? [];
    if (list.length < 3) out.set(off, [...list, c[lang]]);
  }
  return out;
}
