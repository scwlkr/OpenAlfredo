'use client';

import { useEffect } from 'react';

import AppCrashPanel from '@/components/AppCrashPanel';

export default function Error({
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
    <AppCrashPanel
      title="This workspace view crashed."
      description="OpenAlfredo hit a rendering fault in the current route. Your runtime state is still on disk, so you can retry the render or reload the app."
      detail={error.message || error.digest}
      onPrimaryAction={reset}
      onSecondaryAction={() => window.location.reload()}
    />
  );
}
