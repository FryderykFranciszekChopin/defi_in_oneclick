'use client';

import { ThemeToggle } from './ThemeToggle';

interface ClientWrapperProps {
  children: React.ReactNode;
}

export function ClientWrapper({ children }: ClientWrapperProps) {
  return (
    <>
      <ThemeToggle />
      {children}
    </>
  );
}