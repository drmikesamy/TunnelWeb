import { backend } from '$lib/backend';
import { on } from '$lib/backend/bus';
import { DEFAULT_FONT } from '$lib/fonts';
import { uid } from '$lib/format';
import type { ChatFont, ConnectionState, Status, User } from '$lib/types';

const STORAGE_KEY = 'tunnelweb.profile';

class SessionStore {
  me = $state<User>({
    id: '',
    name: '',
    email: '',
    status: 'online',
    personalMessage: '',
    hue: 190,
    font: { ...DEFAULT_FONT },
    group: '',
  });
  /** False until the user has picked a display name. */
  signedIn = $state(false);
  connection = $state<ConnectionState>('connecting');

  constructor() {
    on('connection', ({ state }) => (this.connection = state));
  }

  /** Called once at startup. */
  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    this.me = { ...JSON.parse(saved), status: 'online' };
    this.signedIn = true;
    backend.connect(this.me);
  }

  signIn(name: string, personalMessage: string) {
    this.me = {
      id: uid('u'),
      name: name.trim(),
      email: '',
      status: 'online',
      personalMessage: personalMessage.trim(),
      hue: Math.floor(Math.random() * 360),
      font: { ...DEFAULT_FONT, color: '#1e5bd8' },
      group: '',
    };
    this.#save();
    this.signedIn = true;
    backend.connect(this.me);
  }

  setStatus(status: Status) {
    this.me.status = status;
    this.#changed();
  }

  setName(name: string) {
    if (!name.trim()) return;
    this.me.name = name.trim();
    this.#changed();
  }

  setPersonalMessage(text: string) {
    this.me.personalMessage = text;
    this.#changed();
  }

  setFont(font: Partial<ChatFont>) {
    this.me.font = { ...this.me.font, ...font };
    this.#changed();
  }

  #changed() {
    this.#save();
    backend.updateProfile($state.snapshot(this.me));
  }

  #save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify($state.snapshot(this.me)));
  }
}

export const session = new SessionStore();
