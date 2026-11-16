import { on } from '$lib/backend/bus';
import { notify } from '$lib/notify';
import type { User } from '$lib/types';
import { session } from './session.svelte';

/** Users don't carry a contact-list group; everyone lands in one. */
const DEFAULT_GROUP = 'Friends';

class ContactStore {
  list = $state<User[]>([]);

  constructor() {
    on('users', ({ users }) => {
      this.list = users.map((u) => ({ ...u, group: u.group || DEFAULT_GROUP }));
    });

    on('presence', ({ user }) => {
      const existing = this.list.find((u) => u.id === user.id);
      if (!existing) {
        if (!user.name) return;
        this.list.push({ ...(user as User), group: user.group || DEFAULT_GROUP });
        if (user.status !== 'offline') notify.info(`${user.name} has just signed in.`, user.personalMessage || undefined);
        return;
      }
      const signedIn = existing.status === 'offline' && user.status && user.status !== 'offline';
      Object.assign(existing, { ...user, group: existing.group });
      if (signedIn) notify.info(`${existing.name} has just signed in.`, existing.personalMessage || undefined);
    });
  }

  /** Look up anyone by id, including the signed-in user. */
  get(id: string): User | undefined {
    return id === session.me.id ? session.me : this.list.find((u) => u.id === id);
  }

  getMany(ids: string[]): User[] {
    return ids.map((id) => this.get(id)).filter((u): u is User => !!u);
  }
}

export const contacts = new ContactStore();
