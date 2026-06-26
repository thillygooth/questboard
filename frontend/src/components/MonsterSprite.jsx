import React, { useState, useEffect } from 'react';

// Memoized on its primitive props. The internal frame timer is unaffected (its
// effect deps are unchanged), so the sprite still animates — this only stops a
// parent re-render (e.g. a gold/xp change) from reconciling the sprite needlessly.
function MonsterSprite({ src, sheetW, sheetH, frameSize = 64, frames = 4, fps = 6, display = 48, filter, offsetY = 0 }) {
  const [frame, setFrame] = useState(0);
  const scale = display / frameSize;
  const isStatic = frames <= 1;

  useEffect(() => {
    if (isStatic) return;
    const id = setInterval(() => setFrame(f => (f + 1) % frames), 1000 / fps);
    return () => clearInterval(id);
  }, [frames, fps, isStatic]);

  return (
    <div
      className={isStatic ? 'monster-idle' : undefined}
      style={{
        width: display,
        height: display,
        backgroundImage: `url('${src}')`,
        backgroundSize: `${sheetW * scale}px ${sheetH * scale}px`,
        backgroundPosition: `${-(frame * display)}px ${-(offsetY * scale)}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        flexShrink: 0,
        filter,
      }}
    />
  );
}

export default React.memo(MonsterSprite);
