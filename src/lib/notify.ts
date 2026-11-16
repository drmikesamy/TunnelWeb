import { toast } from 'svelte-sonner';

/** Thin wrapper so stores don't depend on the toast library directly. */
export const notify = {
  info: (title: string, description?: string, onClick?: () => void) =>
    toast(title, {
      description,
      action: onClick ? { label: 'Open', onClick } : undefined,
    }),
};
