import type { Country } from '../schema';

// Regional indicator symbols: "FR" becomes the French flag. Codes are ASCII letters.
const flagEmoji = (cca2: string) =>
  String.fromCodePoint(...cca2.toUpperCase().split('').map((letter) => 0x1f1a5 + letter.charCodeAt(0)));

export function CountryCard({ country }: { country: Country; }) {
  return (
    <li class='overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-800'>
      <div class='flex items-center gap-4 bg-gray-50 px-4 py-3 dark:bg-gray-900'>
        {country.flag
          ? <img src={country.flag} alt='' class='h-12' />
          : <span aria-hidden='true' class='text-4xl leading-none'>{flagEmoji(country.cca2)}</span>}
        <h4 class='text-xl font-bold'>{country.name}</h4>
      </div>
      <dl class='grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 px-4 py-4'>
        <dt class='text-gray-600 dark:text-gray-400'>📍 Capital</dt>
        <dd class='text-right'>{country.capital || '—'}</dd>
        <dt class='text-gray-600 dark:text-gray-400'>🌎 Region</dt>
        <dd class='text-right'>{country.region || '—'}</dd>
        <dt class='text-gray-600 dark:text-gray-400'>💬 Languages</dt>
        <dd class='text-right'>{Object.values(country.languages).join(', ') || '—'}</dd>
      </dl>
    </li>
  );
}
