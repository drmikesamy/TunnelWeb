// WebSocket hub. It keeps the user directory and call membership, routes JSON
// events between users, and relays binary call media to everyone else in the
// sender's call. It stores no chat history.
import { WebSocketServer } from 'ws';

const MAX_PAYLOAD = 4 * 1024 * 1024;
const MEDIA_BACKPRESSURE = 2 * 1024 * 1024; // drop frames for slow receivers
const STATUSES = new Set(['online', 'busy', 'away', 'brb', 'phone', 'lunch', 'offline']);

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Accept only the fields the UI needs, with sane sizes. */
function cleanUser(u, id) {
  const font = u?.font ?? {};
  return {
    id,
    name: str(u?.name, 40) || 'Guest',
    email: '',
    status: STATUSES.has(u?.status) ? u.status : 'online',
    personalMessage: str(u?.personalMessage, 120),
    hue: Number.isFinite(u?.hue) ? Math.round(u.hue) % 360 : 190,
    font: {
      family: str(font.family, 40) || 'Segoe UI',
      size: Math.min(28, Math.max(9, Number(font.size) || 13)),
      color: /^#[0-9a-f]{6}$/i.test(font.color) ? font.color : '#0b3b4a',
      bold: !!font.bold,
      italic: !!font.italic,
    },
    group: '',
  };
}

export function attachHub(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: MAX_PAYLOAD });
  /** @type {Map<string, { user: any, sockets: Set<import('ws').WebSocket>, callId: string | null }>} */
  const users = new Map();
  /** @type {Map<string, Set<string>>} */
  const calls = new Map();

  const visible = (entry) => ({ ...entry.user, status: entry.sockets.size ? entry.user.status : 'offline' });

  function sendTo(userId, data) {
    for (const ws of users.get(userId)?.sockets ?? []) if (ws.readyState === ws.OPEN) ws.send(data);
  }

  function broadcast(obj, exceptId) {
    const text = JSON.stringify(obj);
    for (const id of users.keys()) if (id !== exceptId) sendTo(id, text);
  }

  function announceCall(callId) {
    const members = [...(calls.get(callId) ?? [])];
    const text = JSON.stringify({ type: 'callMembers', callId, members });
    for (const id of members) sendTo(id, text);
  }

  function leaveCall(userId) {
    const entry = users.get(userId);
    const callId = entry?.callId;
    if (!callId) return;
    entry.callId = null;
    const members = calls.get(callId);
    members?.delete(userId);
    if (!members?.size) calls.delete(callId);
    else announceCall(callId);
  }

  function joinCall(userId, callId) {
    const entry = users.get(userId);
    if (!entry || typeof callId !== 'string' || callId.length > 64) return;
    if (entry.callId && entry.callId !== callId) leaveCall(userId);
    entry.callId = callId;
    if (!calls.has(callId)) calls.set(callId, new Set());
    calls.get(callId).add(userId);
    announceCall(callId);
  }

  function relayMedia(userId, data) {
    const callId = users.get(userId)?.callId;
    if (!callId) return;
    const id = Buffer.from(userId);
    const frame = Buffer.concat([Buffer.from([id.length]), id, data]);
    for (const member of calls.get(callId) ?? []) {
      if (member === userId) continue;
      for (const ws of users.get(member)?.sockets ?? []) {
        if (ws.readyState === ws.OPEN && ws.bufferedAmount < MEDIA_BACKPRESSURE) ws.send(frame);
      }
    }
  }

  wss.on('connection', (ws) => {
    /** @type {string | null} */
    let me = null;

    ws.on('message', (data, isBinary) => {
      if (isBinary) return me && relayMedia(me, data);
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (msg.type === 'hello') {
        const id = str(msg.user?.id, 64);
        if (!id) return;
        me = id;
        const entry = users.get(id) ?? { user: null, sockets: new Set(), callId: null };
        entry.user = cleanUser(msg.user, id);
        entry.sockets.add(ws);
        users.set(id, entry);
        ws.send(JSON.stringify({ type: 'welcome', users: [...users.values()].map(visible) }));
        broadcast({ type: 'presence', user: visible(entry) }, id);
        return;
      }
      if (!me) return; // everything else needs a hello first

      switch (msg.type) {
        case 'profile': {
          const entry = users.get(me);
          entry.user = cleanUser(msg.user, me);
          broadcast({ type: 'presence', user: visible(entry) }, me);
          break;
        }
        case 'route': {
          if (!Array.isArray(msg.to) || typeof msg.event?.type !== 'string') return;
          const text = JSON.stringify({ ...msg.event, from: me });
          for (const to of new Set(msg.to)) if (to !== me && users.has(to)) sendTo(to, text);
          break;
        }
        case 'call':
          if (msg.action === 'join') joinCall(me, msg.callId);
          else if (msg.action === 'leave' && users.get(me)?.callId === msg.callId) leaveCall(me);
          break;
      }
    });

    ws.on('close', () => {
      const entry = me && users.get(me);
      if (!entry) return;
      entry.sockets.delete(ws);
      if (entry.sockets.size) return;
      leaveCall(me);
      broadcast({ type: 'presence', user: visible(entry) }, me);
    });
  });

  return wss;
}
