# TunnelWeb

A Frutiger Aero messenger in your browser, in the spirit of classic MSN Messenger.
It has chat, chatrooms, file sending, and voice/video calls (1:1 and group).
Machines connect peer-to-peer through [p2p-tunnel](https://github.com/drmikesamy/p2p-tunnel)
(Iroh), so nobody needs port forwarding or a server.

## Use it

Anyone with Node.js 18+:

```bash
npx tunnelweb
```

This starts a chat on your machine, opens it in your browser, and prints an invite:

```
Invite friends by sending them this command:

  npx tunnelweb join endpointaaj…
```

Your friend runs that command. TunnelWeb opens in their browser, connected to you.
Anyone with the command can join while your terminal stays open.

| Option | |
|---|---|
| `--port <n>` | Port for the local chat server (default 4777) |
| `--no-open` | Don't open the browser |
| `--local` | Host without the tunnel (this machine only) |

Guests are served at `http://localhost:8080` (fixed by p2p-tunnel 0.1.12), so that port
must be free on their machine.

## Develop

```bash
npm install
npm run dev:host   # terminal 1: chat host on :4777 (no tunnel, API only)
npm run dev        # terminal 2: UI with hot reload; Vite proxies /api and /ws to the host
npm run check      # svelte-check + tsc
npm run build

npm start          # build, then host with the tunnel (what npx runs)
```

To try several people on one machine, open the dev URL in separate browser profiles or
private windows. Each one keeps its own identity.

## Architecture

```
browser (Svelte)                                host machine (server/)
  components → stores → backend ──── WebSocket /ws ────▶ hub.js    users, routing, call membership,
                           │   └──── HTTP /api/files ──▶ files.js  media relay / temp file store
                           └ media engine (WebCodecs)    cli.js    serves dist/, runs p2p-tunnel
guests reach the host via:  npx tunnelweb join <ticket>  →  p2p-tunnel connect  →  localhost:8080
```

- **Components** only read stores and call store actions.
- **Stores** (`src/lib/stores`) hold state and talk to the host only through the
  `Backend` interface in `src/lib/backend`, which `live.ts` implements.
- **The hub keeps no chat history.** It routes events between users and relays call media.
  Conversations live in each browser, so refreshing clears them. Your profile is kept in
  `localStorage`.
- **Calls** use the same wire format as p2p-tunnel's `call.html`: VP8 video through
  WebCodecs, plus raw PCM audio. The hub forwards frames to everyone else in the call.
  Each browser decodes every other participant, so group calls suit a handful of people.
  You need a browser with WebCodecs (Chrome, Edge, Safari 16.4+, Firefox 130+).
- **Files** are uploaded once to the host and downloaded by each person who accepts.
  They're kept in a temp folder that's deleted when the host stops.

## Publishing

`npm publish` builds `dist/` first (via `prepack`) and ships only `dist/` and `server/`.
The only runtime dependencies are `p2p-tunnel`, `ws`, `sirv` and `open`.

## Disclaimer

TunnelWeb is experimental hobby software, provided **"as is", without warranty of any
kind**, express or implied. **You use it entirely at your own risk.**

To the fullest extent permitted by law, the author and contributors are **not liable** for
any damage, loss or harm arising from using, or being unable to use, this software. This
includes damage to your computer or other devices, loss or corruption of data, security
or privacy breaches, malware, lost profits, or any other direct, indirect, incidental or
consequential damages, however caused.

By running TunnelWeb you accept that:

- **It opens a network connection to your machine.** Anyone who has your invite command
  can connect to your chat while it runs. Only share invites with people you trust, and stop
  TunnelWeb (Ctrl+C) when you're done.
- **Calls use your camera and microphone** once you allow it in your browser, and stream to
  everyone in the call.
- **No chat history or data is guaranteed to be kept or to stay private.** Don't use it for
  anything sensitive, critical or confidential.
- **You are responsible for how you use it**, including following the laws that apply to
  you and the terms of your network or service provider.
- **Files come from other people.** Files sent to you are not scanned or checked. Only
  accept files you expect, and treat them as you would any download from the internet.

This disclaimer supplements the warranty disclaimer and limitation of liability in the
[LICENSE](LICENSE), which also apply.

## License

MIT. See [LICENSE](LICENSE).
