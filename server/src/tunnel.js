// Standalone safe dummy tunnel handler
// Automatic ngrok setup has been removed to avoid native binary runtime conflicts.
// Users requiring out-of-network access can follow PORT_FORWARDING_GUIDE.md.

export async function startTunnel() {
  return { active: false, url: null };
}

export async function stopTunnel() {
  return { active: false, url: null };
}

export function getTunnelStatus() {
  return { active: false, url: null };
}
