'use client';

import { useEffect, useRef } from 'react';

export default function useAtajos(actions, enabled = true) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    if (!enabled) return undefined;

    function handleKeyDown(event) {
      const action = actionsRef.current?.[event.key];
      if (typeof action !== 'function') return;
      event.preventDefault();
      event.stopPropagation();
      action(event);
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled]);
}
