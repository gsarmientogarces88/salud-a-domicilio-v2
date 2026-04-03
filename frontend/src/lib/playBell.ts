const BELL_SRC = '/sounds/bell.mp3';

let audioUnlocked = false;

/**
 * Los navegadores bloquean audio hasta una interacción del usuario.
 * Tras el primer pointerdown/keydown, se permite reproducir la campana.
 */
export function registerBellUnlockListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  const tryUnlock = () => {
    if (audioUnlocked) return;
    const a = new Audio(BELL_SRC);
    a.volume = 0.001;
    void a
      .play()
      .then(() => {
        audioUnlocked = true;
        a.pause();
        a.remove();
      })
      .catch(() => {
        /* sigue bloqueado hasta otra interacción */
      });
  };

  window.addEventListener('pointerdown', tryUnlock, { passive: true });
  window.addEventListener('keydown', tryUnlock);

  return () => {
    window.removeEventListener('pointerdown', tryUnlock);
    window.removeEventListener('keydown', tryUnlock);
  };
}

export function playBell(): void {
  if (typeof window === 'undefined' || !audioUnlocked) return;
  try {
    const a = new Audio(BELL_SRC);
    a.volume = 0.85;
    void a.play().catch(() => {});
  } catch {
    /* ignore */
  }
}
