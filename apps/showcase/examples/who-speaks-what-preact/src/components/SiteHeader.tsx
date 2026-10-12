import { useLocation } from 'preact-iso';
import { useEffect, useState } from 'preact/hooks';

const engines = [
  { href: '/', label: 'useReducer' },
  { href: '/xstate', label: 'XState' },
];

export function SiteHeader(
  { searchText, onSearch }: { searchText: string; onSearch: (text: string) => void; },
) {
  const [text, setText] = useState(searchText);
  const { path } = useLocation();
  useEffect(() => setText(searchText), [searchText]);

  return (
    <header class='border-b border-gray-200 dark:border-gray-800'>
      <div class='mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center'>
        <a href='/' class='flex shrink-0 items-center gap-3'>
          <img src='/assets/android-chrome-192x192.png' alt='' class='size-10' />
          <h1 class='text-2xl font-semibold'>Who speaks what?</h1>
        </a>
        <form
          role='search'
          class='relative flex-1 sm:max-w-lg'
          onSubmit={(event) => {
            event.preventDefault();
            onSearch(text.trim());
          }}
        >
          <svg
            aria-hidden='true'
            viewBox='0 0 24 24'
            class='pointer-events-none absolute inset-y-0 left-3 my-auto size-5 fill-current text-gray-500'
          >
            <path d='M16.32 14.9l1.1 1.1c.4-.02.83.13 1.14.44l3 3a1.5 1.5 0 0 1-2.12 2.12l-3-3a1.5 1.5 0 0 1-.44-1.14l-1.1-1.1a8 8 0 1 1 1.41-1.41l.01-.01zM10 16a6 6 0 1 0 0-12 6 6 0 0 0 0 12z' />
          </svg>
          <input
            type='search'
            aria-label='Search countries'
            placeholder='Search countries, then press Enter'
            value={text}
            onInput={(event) => setText(event.currentTarget.value)}
            class='w-full rounded-lg border-transparent bg-gray-100 py-2 pr-4 pl-10 focus:border-blue-500 focus:bg-white focus:ring-blue-500 dark:bg-gray-900 dark:focus:bg-gray-950'
          />
        </form>
        <nav
          aria-label='State engine'
          class='flex gap-1 rounded-lg bg-gray-100 p-1 text-sm sm:ml-auto dark:bg-gray-900'
        >
          {engines.map((engine) => (
            <a
              key={engine.href}
              href={engine.href}
              aria-current={path === engine.href ? 'page' : undefined}
              class='rounded-md px-3 py-1 aria-[current=page]:bg-white aria-[current=page]:font-semibold aria-[current=page]:shadow-sm dark:aria-[current=page]:bg-gray-800'
            >
              {engine.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
