import ngrok from '@ngrok/ngrok';

let currentListener = null;
let tunnelStatus = {
  active: false,
  url: null,
  error: null,
  startedAt: null,
  domain: null
};

/**
 * Starts an ngrok reverse proxy tunnel to forward the local PhoneLink Hub server port.
 * Allows out-of-network parental control over mobile data from anywhere in the world.
 */
export async function startTunnel({ port, authtoken, domain }) {
  if (currentListener) {
    try {
      await currentListener.close();
    } catch (_) {}
    currentListener = null;
  }

  if (!authtoken || !authtoken.trim()) {
    throw new Error('ngrok AuthToken is required. Obtain your free token from https://dashboard.ngrok.com/get-started/your-authtoken');
  }

  try {
    const options = {
      addr: port,
      authtoken: authtoken.trim()
    };

    if (domain && domain.trim()) {
      options.domain = domain.trim();
    }

    currentListener = await ngrok.forward(options);
    const url = currentListener.url();

    tunnelStatus = {
      active: true,
      url,
      error: null,
      startedAt: Date.now(),
      domain: domain ? domain.trim() : null
    };

    console.log(`[ngrok] Cloud tunnel active at: ${url} -> localhost:${port}`);
    return tunnelStatus;
  } catch (err) {
    tunnelStatus = {
      active: false,
      url: null,
      error: err.message || 'Failed to establish ngrok tunnel',
      startedAt: null,
      domain: domain ? domain.trim() : null
    };
    console.error('[ngrok] Failed to start tunnel:', err.message);
    throw err;
  }
}

/**
 * Disconnects the active ngrok tunnel.
 */
export async function stopTunnel() {
  if (currentListener) {
    try {
      await currentListener.close();
    } catch (e) {
      console.warn('[ngrok] Error closing listener:', e.message);
    }
    currentListener = null;
  }
  tunnelStatus = {
    active: false,
    url: null,
    error: null,
    startedAt: null,
    domain: null
  };
  console.log('[ngrok] Cloud tunnel stopped.');
  return tunnelStatus;
}

export function getTunnelStatus() {
  return tunnelStatus;
}

