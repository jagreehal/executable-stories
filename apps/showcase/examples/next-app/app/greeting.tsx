'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Greeting() {
  const name = useSearchParams().get('name') ?? 'stranger';
  const [message, setMessage] = useState('Loading…');

  useEffect(() => {
    void fetch('/api/greeting').then((r) => r.json()).then((body: { message: string; }) =>
      setMessage(body.message)
    );
  }, []);

  return (
    <>
      <p>Name from URL: {name}</p>
      <p>{message}</p>
    </>
  );
}
