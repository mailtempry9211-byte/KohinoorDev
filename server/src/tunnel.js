import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let ngrokProcess = null;
let tunnelStatus = {
  isRunning: false,
  activeUrl: null,
  authtoken: '',
  domain: '',
  autoStart: false,
  startedAt: null,
  error: null
};

// Find ngrok binary on system or pre-packaged
function findNgrokBinary() {
  const candidates = [
    path.join(__dirname, '../bin/ngrok.exe'),
    path.join(__dirname, '../bin/ngrok'),
    path.join(process.cwd(), 'server/bin/ngrok.exe'),
    path.join(process.cwd(), 'server/bin/ngrok')
  ];

  if (process.resourcesPath) {
    candidates.push(
      path.join(process.resourcesPath, 'server/bin/ngrok.exe'),
      path.join(process.resourcesPath, 'server/bin/ngrok'),
      path.join(process.resourcesPath, 'bin/ngrok.exe'),
      path.join(process.resourcesPath, 'bin/ngrok')
    );
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        fs.chmodSync(p, 0o755);
      } catch (_) {}
      return p;
    }
  }

  // Check if available on system PATH
  try {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'where ngrok' : 'which ngrok';
    const out = execSync(cmd, { stdio: 'pipe' }).toString().trim().split('\n')[0].trim();
    if (out && fs.existsSync(out)) return out;
  } catch (_) {}

  return null;
}

// Download official stable ngrok binary if not already present
async function ensureNgrokBinary(targetDir) {
  const existing = findNgrokBinary();
  if (existing) return existing;

  const binDir = targetDir || path.join(__dirname, '../bin');
  fs.mkdirSync(binDir, { recursive: true });
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'ngrok.exe' : 'ngrok';
  const binPath = path.join(binDir, binName);
  if (fs.existsSync(binPath)) return binPath;

  const downloadUrl = isWin
    ? 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip'
    : 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz';

  console.log(`[ngrok] Downloading standalone binary from ${downloadUrl}...`);
  const tmpZip = path.join(binDir, 'ngrok_dl.tmp');

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tmpZip);
    const get = (url) => {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', (err) => {
        try { fs.unlinkSync(tmpZip); } catch (_) {}
        reject(err);
      });
    };
    get(downloadUrl);
  });

  // Extract
  if (isWin) {
    execSync(`tar -xf "${tmpZip}" -C "${binDir}"`);
  } else {
    execSync(`tar -xzf "${tmpZip}" -C "${binDir}"`);
    fs.chmodSync(binPath, 0o755);
  }
  try { fs.unlinkSync(tmpZip); } catch (_) {}

  if (fs.existsSync(binPath)) {
    console.log(`[ngrok] Binary installed successfully to ${binPath}`);
    return binPath;
  }
  throw new Error('Failed to install ngrok binary');
}

// Poll ngrok local web inspection service on 127.0.0.1:4040 to retrieve the live public tunnel URL
function fetchTunnelUrl(retries = 25, delayMs = 400) {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    const check = () => {
      attempt++;
      const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const tunnels = data.tunnels || [];
            if (tunnels.length > 0) {
              const httpsTunnel = tunnels.find((t) => t.proto === 'https') || tunnels[0];
              if (httpsTunnel && httpsTunnel.public_url) {
                return resolve(httpsTunnel.public_url);
              }
            }
          } catch (_) {}

          if (attempt < retries) {
            setTimeout(check, delayMs);
          } else {
            reject(new Error('Timeout waiting for ngrok tunnel URL'));
          }
        });
      });

      req.on('error', () => {
        if (attempt < retries) {
          setTimeout(check, delayMs);
        } else {
          reject(new Error('ngrok web service not responding on port 4040'));
        }
      });
      req.setTimeout(1500, () => req.destroy());
    };

    setTimeout(check, 300);
  });
}

/**
 * Starts ngrok reverse proxy tunnel for the local PhoneLink Hub server port.
 */
export async function startTunnel({ port = 5000, authtoken, domain, autoStart = true, dataDir }) {
  if (tunnelStatus.isRunning && tunnelStatus.activeUrl) {
    return tunnelStatus;
  }

  const token = (authtoken || tunnelStatus.authtoken || '').trim();
  const dom = (domain || tunnelStatus.domain || '').trim();

  if (!token) {
    const err = 'ngrok AuthToken is required. Obtain your free token from https://dashboard.ngrok.com/get-started/your-authtoken';
    tunnelStatus.error = err;
    throw new Error(err);
  }

  await stopTunnel();

  const binPath = await ensureNgrokBinary(dataDir ? path.join(dataDir, 'bin') : null);
  const configDir = dataDir || path.join(__dirname, '../data');
  fs.mkdirSync(configDir, { recursive: true });
  const configPath = path.join(configDir, 'ngrok.yml');

  // Generate robust configuration with crl_noverify and DNS bypass (matching Android Parent Hub engine)
  const yamlContent = [
    'version: "2"',
    `authtoken: "${token}"`,
    'crl_noverify: true',
    'update_check: false',
    'dns_resolver_ips:',
    '  - 8.8.8.8',
    '  - 1.1.1.1',
    '  - 8.8.4.4',
    '  - 1.0.0.1'
  ].join('\n');
  fs.writeFileSync(configPath, yamlContent, 'utf8');

  const args = [
    'http',
    port.toString(),
    `--config=${configPath}`,
    '--log=stdout',
    '--log-format=term'
  ];

  if (dom) {
    args.push(`--url=${dom}`);
  }

  console.log(`[ngrok] Spawning: ${binPath} ${args.join(' ')}`);

  ngrokProcess = spawn(binPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  ngrokProcess.stdout.on('data', (d) => {
    const str = d.toString().trim();
    if (str) console.log(`[ngrok] ${str}`);
  });

  ngrokProcess.stderr.on('data', (d) => {
    const str = d.toString().trim();
    if (str) console.warn(`[ngrok-err] ${str}`);
  });

  ngrokProcess.on('exit', (code, sig) => {
    console.log(`[ngrok] Process exited with code ${code}, signal ${sig}`);
    ngrokProcess = null;
    tunnelStatus.isRunning = false;
    tunnelStatus.activeUrl = null;
  });

  try {
    const publicUrl = await fetchTunnelUrl();
    tunnelStatus = {
      isRunning: true,
      activeUrl: publicUrl,
      authtoken: token,
      domain: dom,
      autoStart: Boolean(autoStart),
      startedAt: Date.now(),
      error: null
    };
    console.log(`[ngrok] Cloud tunnel successfully online at: ${publicUrl} -> http://127.0.0.1:${port}`);
    return tunnelStatus;
  } catch (err) {
    tunnelStatus.isRunning = false;
    tunnelStatus.activeUrl = null;
    tunnelStatus.error = err.message;
    await stopTunnel();
    throw err;
  }
}

/**
 * Stops the active ngrok tunnel process.
 */
export async function stopTunnel() {
  if (ngrokProcess) {
    try {
      if (process.platform === 'win32') {
        try { execSync(`taskkill /pid ${ngrokProcess.pid} /T /F`, { stdio: 'ignore' }); } catch (_) {}
      }
      ngrokProcess.kill('SIGTERM');
    } catch (_) {}
    ngrokProcess = null;
  }
  tunnelStatus.isRunning = false;
  tunnelStatus.activeUrl = null;
  return tunnelStatus;
}

export function getTunnelStatus() {
  return { ...tunnelStatus };
}

// Clean up child process on parent exit
process.on('exit', () => {
  if (ngrokProcess) {
    try { ngrokProcess.kill('SIGKILL'); } catch (_) {}
  }
});
