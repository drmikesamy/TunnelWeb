// Guest-side TCP forwarder in front of `p2p-tunnel connect`.
//
// Browsers open spare "preconnect" sockets that may never carry a request.
// p2p-tunnel 0.1.12 turns every local socket into a tunnel connection, and its
// `share` side waits on each new connection in turn: one idle socket stalls
// every request behind it, and when the browser finally drops it, `share` exits.
// This forwarder only dials the tunnel once the browser has actually sent bytes.
import net from 'node:net';

/** Listen on `preferredPort` (or any free port) and forward to 127.0.0.1:`targetPort`. */
export function lazyProxy(targetPort, preferredPort = 0) {
  const server = net.createServer((client) => {
    client.on('error', () => {});
    client.once('data', (first) => {
      client.pause();
      const upstream = net.connect(targetPort, '127.0.0.1', () => {
        upstream.write(first);
        client.pipe(upstream);
        upstream.pipe(client);
        client.resume();
      });
      const close = () => {
        client.destroy();
        upstream.destroy();
      };
      upstream.on('error', close);
      upstream.on('close', close);
      client.on('close', close);
    });
  });

  return new Promise((resolve, reject) => {
    const tryPort = (port, fallback) => {
      server.once('error', (err) => (err.code === 'EADDRINUSE' && fallback ? tryPort(0, false) : reject(err)));
      server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    };
    tryPort(preferredPort, preferredPort !== 0);
  });
}
