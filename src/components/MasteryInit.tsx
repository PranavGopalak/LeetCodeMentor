'use client';

import { useEffect } from 'react';
import { initMastery } from '@/lib/mastery';

export default function MasteryInit() {
  useEffect(() => {
    initMastery();
  }, []);

  return null;
}
