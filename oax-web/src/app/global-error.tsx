'use client';

import { useEffect } from 'react';

import AppCrashPanel from '@/components/AppCrashPanel';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <AppCrashPanel
          title="OpenAlfredo could not render."
          description="A top-level error escaped the app shell. Retry once to recover in place, or reload the page to rebuild the full UI."
          detail={error.message || error.digest}
          onPrimaryAction={reset}
          onSecondaryAction={() => window.location.reload()}
        />
      </body>
    </html>
  );
}
