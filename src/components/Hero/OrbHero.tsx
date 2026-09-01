'use client';

import React, { useCallback, useState } from 'react';
import { DraggableOrb } from '@/components/Orb/DraggableOrb';
import { FunnyHeadline } from './FunnyHeadline';
import { RoleSearch } from './RoleSearch';

interface OrbHeroProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export const OrbHero: React.FC<OrbHeroProps> = ({ onSearch, isLoading = false }) => {
  const [excitement, setExcitement] = useState(0);

  // Stable identity so RoleSearch's effect doesn't fire on every parent render.
  const handleExcitement = useCallback((value: number) => setExcitement(value), []);

  return (
    <section className="relative flex w-full flex-col items-center overflow-hidden px-5 pb-16 pt-2 sm:px-8">
      <div aria-hidden="true" className="hero-wash pointer-events-none absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="linear-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.4] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black,transparent)]"
      />

      {/* The orb. The Siri-wave preset paints a band through the middle of a
          square canvas, so the negative margin below reclaims the transparent
          margins instead of leaving a dead gap under it. */}
      <div className="relative aspect-square w-full max-w-[400px] shrink-0 sm:max-w-[480px]">
        <DraggableOrb ambientExcitement={excitement} />
      </div>

      <div className="relative z-10 -mt-20 flex w-full flex-col items-center gap-6 sm:-mt-28">
        <FunnyHeadline />
        <RoleSearch
          onSearch={onSearch}
          onExcitementChange={handleExcitement}
          isLoading={isLoading}
        />
        <p className="text-[12.5px] text-[#62666d]">
          Grab the orb and pull it — it stretches. Nothing happens, it just feels nice.
        </p>
      </div>
    </section>
  );
};
