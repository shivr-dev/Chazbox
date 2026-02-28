class SoundManager {
  private static instance: SoundManager;
  private sounds: Record<string, HTMLAudioElement> = {};

  private constructor() {
    this.preloadSounds();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private preloadSounds() {
    const soundFiles = [
      'sounds_click',
      'sounds_button',
      'toast',
      'pop',
      'sounds_drawer_open',
      'sounds_drawer_close'
    ];

    soundFiles.forEach(name => {
      const basePath = import.meta.env.BASE_URL || '/';
      const cleanBasePath = basePath.endsWith('/') ? basePath : basePath + '/';
      const audio = new Audio(`${cleanBasePath}sounds/${name}.ogg`);
      audio.preload = 'auto';
      this.sounds[name] = audio;
    });
  }

  public play(name: string) {
    const sound = this.sounds[name];
    if (sound) {
      // Clone the node to allow overlapping sounds
      const clone = sound.cloneNode() as HTMLAudioElement;
      clone.play().catch(e => console.warn('Audio play failed:', e));
    }
  }
}

export const soundManager = SoundManager.getInstance();
