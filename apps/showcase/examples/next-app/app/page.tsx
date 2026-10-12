import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { Greeting } from './greeting';

export default async function Page() {
  const role = (await cookies()).get('role')?.value ?? 'guest';

  return (
    <main>
      <p>Server sees role: {role}</p>
      <Suspense>
        <Greeting />
      </Suspense>
    </main>
  );
}
