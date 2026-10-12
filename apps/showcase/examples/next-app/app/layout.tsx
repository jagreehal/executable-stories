import type { ReactNode } from 'react';
import { Scenarios } from './scenarios';

export default function RootLayout({ children }: { children: ReactNode; }) {
  return (
    <html lang='en'>
      <body>
        <Scenarios>{children}</Scenarios>
      </body>
    </html>
  );
}
