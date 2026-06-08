'use client';

import { useEdition } from './context';
import { HeaderOverlay as RomeOverlay }     from './2026-rome/components';
import { HeaderOverlay as BuildersOverlay } from './builders/components';
import { HeaderOverlay as BaseOverlay }     from './base/components';

export function EditionHeaderOverlay() {
  const ed = useEdition();
  switch (ed.id) {
    case 'builders':  return <BuildersOverlay />;
    case '2026-rome': return <RomeOverlay />;
    default:          return <BaseOverlay />;
  }
}
