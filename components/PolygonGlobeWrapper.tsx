'use client';

import dynamic from 'next/dynamic';

export const PolygonGlobe = dynamic(
  () => import('./PolygonGlobe').then(mod => mod.PolygonGlobe),
  { 
    ssr: false,
    loading: () => <div className="fixed inset-0 pointer-events-none" />
  }
);