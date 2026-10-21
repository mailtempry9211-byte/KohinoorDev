#!/usr/bin/env bash
# ==============================================================================
# PhoneLink Hub - Universal Automated Installer for Termux (Android) & Linux
# Supports: Termux (ARM64/ARM), Ubuntu, Debian, Kali, Raspberry Pi OS, Arch, CentOS
# ==============================================================================

set -e

# Colors for terminal UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear 2>/dev/null || true

echo -e "${CYAN}${BOLD}"
echo "====================================================================="
echo "   📱  P H O N E L I N K   H U B  -  S E R V E R   I N S T A L L E R "
echo "====================================================================="
echo -e "${NC}"
echo -e "${WHITE}Turn an old Android phone or Linux VPS into an always-on 24/7 cloud server!${NC}\n"

# 1. Detect Environment & Architecture
IS_TERMUX=false
if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ]; then
  IS_TERMUX=true
  echo -e "${YELLOW}[*] Detected Environment: ${BOLD}Android Termux${NC}"
else
  echo -e "${BLUE}[*] Detected Environment: ${BOLD}Standard Linux OS${NC}"
fi

ARCH=$(uname -m)
echo -e "${BLUE}[*] CPU Architecture: ${BOLD}${ARCH}${NC}"

# 2. Termux-Specific Optimizations
if [ "$IS_TERMUX" = true ]; then
  echo -e "${CYAN}[*] Requesting Termux Wake Lock (prevents Android CPU sleep)...${NC}"
  if command -v termux-wake-lock &>/dev/null; then
    termux-wake-lock
    echo -e "${GREEN}[✔] Wake lock acquired successfully.${NC}"
  else
    echo -e "${YELLOW}[!] termux-wake-lock not found, skipping.${NC}"
  fi
fi

# 3. Install Package Dependencies
echo -e "\n${CYAN}${BOLD}[1/5] Checking and Installing Dependencies...${NC}"

if [ "$IS_TERMUX" = true ]; then
  echo -e "${YELLOW}[*] Updating Termux packages (pkg update)...${NC}"
  pkg update -y || apt-get update -y
  echo -e "${YELLOW}[*] Installing Node.js, Git, Curl, Tar, and OpenSSL...${NC}"
  pkg install -y nodejs-lts git curl tar openssl-tool jq || pkg install -y nodejs git curl tar jq
elif command -v apt-get &>/dev/null; then
  SUDO=""
  if [ "$(id -u)" -ne 0 ]; then
    if command -v sudo &>/dev/null; then
      SUDO="sudo"
    else
      echo -e "${RED}[!] Please run as root or install sudo.${NC}"
      exit 1
    fi
  fi
  $SUDO apt-get update -y
  $SUDO apt-get install -y curl git tar jq build-essential

  # Check Node version
  NEED_NODE=true
  if command -v node &>/dev/null; then
    NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
      NEED_NODE=false
    fi
  fi
  if [ "$NEED_NODE" = true ]; then
    echo -e "${YELLOW}[*] Installing Node.js LTS (v20.x)...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
    $SUDO apt-get install -y nodejs
  fi
elif command -v pacman &>/dev/null; then
  sudo pacman -Sy --noconfirm nodejs npm git curl tar jq
elif command -v dnf &>/dev/null; then
  sudo dnf install -y nodejs npm git curl tar jq
else
  echo -e "${YELLOW}[!] Unknown package manager. Please ensure Node.js 18+ and Git are installed.${NC}"
fi

echo -e "${GREEN}[✔] Node.js version: $(node -v) | NPM: $(npm -v)${NC}"

# 4. Resolve Project Directory
echo -e "\n${CYAN}${BOLD}[2/5] Setting Up Project Repository...${NC}"

TARGET_DIR="$PWD"
# If not inside a cloned repo containing server/src/index.js, clone or set up
if [ ! -f "server/src/index.js" ]; then
  if [ -d "$HOME/phonelink-hub/server" ]; then
    TARGET_DIR="$HOME/phonelink-hub"
    cd "$TARGET_DIR"
  else
    echo -e "${YELLOW}[*] Current directory is not PhoneLink Hub repository.${NC}"
    read -rp "Enter directory to install to (Default: $HOME/phonelink-hub): " CHOSEN_DIR
    TARGET_DIR="${CHOSEN_DIR:-$HOME/phonelink-hub}"
    if [ ! -d "$TARGET_DIR" ]; then
      echo -e "${YELLOW}[*] Cloning PhoneLink Hub into $TARGET_DIR...${NC}"
      # Default repo if not provided
      REPO_URL="https://github.com/$(git config --get remote.origin.url 2>/dev/null || echo '')"
      if [ -z "$REPO_URL" ] || [ "$REPO_URL" = "https://github.com/" ]; then
        read -rp "Enter GitHub Repository URL: " REPO_URL
      fi
      git clone "$REPO_URL" "$TARGET_DIR"
    fi
    cd "$TARGET_DIR"
  fi
fi

echo -e "${GREEN}[✔] Working in directory: $TARGET_DIR${NC}"

# 5. Interactive Configuration
echo -e "\n${CYAN}${BOLD}[3/5] Quick Server Configuration (Press Enter for Defaults)${NC}"

# Dashboard PIN
read -rp "Set Dashboard Security PIN [Default: 9211]: " CFG_PIN
CFG_PIN="${CFG_PIN:-9211}"

# Server Port
read -rp "Set Web Server Port [Default: 3000]: " CFG_PORT
CFG_PORT="${CFG_PORT:-3000}"

# Ngrok Authtoken
echo -e "${WHITE}To access your server remotely from outside your home Wi-Fi via Ngrok:${NC}"
echo -e "${WHITE}Get a free token at https://dashboard.ngrok.com/get-started/your-authtoken${NC}"
read -rp "Enter Ngrok Authtoken (Optional - press Enter to skip): " CFG_NGROK_TOKEN

# Save persistent configuration
mkdir -p server/data
cat <<EOF > server/data/auth_config.json
{
  "pin": "${CFG_PIN}",
  "updatedAt": $(date +%s%3N)
}
EOF

cat <<EOF > .env
NODE_ENV=production
PORT=${CFG_PORT}
DASHBOARD_PIN=${CFG_PIN}
EOF

if [ -n "$CFG_NGROK_TOKEN" ]; then
  cat <<EOF > server/data/tunnel_config.json
{
  "authtoken": "${CFG_NGROK_TOKEN}",
  "autoStart": true
}
EOF
fi

echo -e "${GREEN}[✔] Configuration saved! PIN: ${CFG_PIN}${NC}"
{
  "authtoken": "${CFG_NGROK_TOKEN}",
  "autoStart": true
}
EOF
fi

echo -e "${GREEN}[✔] Configuration saved! PIN: ${CFG_PIN} | License: Auto-Activated.${NC}"

# 6. Install Dependencies & Build Dashboard
echo -e "\n${CYAN}${BOLD}[4/5] Building Dashboard and Installing Server Dependencies...${NC}"

echo -e "${YELLOW}[*] Installing server npm packages...${NC}"
npm --prefix server install --no-audit --no-fund

echo -e "${YELLOW}[*] Installing dashboard npm packages...${NC}"
npm --prefix dashboard install --no-audit --no-fund

echo -e "${YELLOW}[*] Compiling production web dashboard...${NC}"
npm --prefix dashboard run build

echo -e "${GREEN}[✔] Build completed successfully.${NC}"

# 7. Pre-configure Ngrok Binary for Architecture
echo -e "\n${CYAN}${BOLD}[5/5] Configuring Architecture Tunneling...${NC}"
mkdir -p server/bin

NGROK_DL_URL=""
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  NGROK_DL_URL="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz"
elif [ "$ARCH" = "armv7l" ] || [ "$ARCH" = "arm" ]; then
  NGROK_DL_URL="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm.tgz"
elif [ "$ARCH" = "x86_64" ]; then
  NGROK_DL_URL="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz"
fi

if [ -n "$NGROK_DL_URL" ] && [ ! -f "server/bin/ngrok" ]; then
  echo -e "${YELLOW}[*] Downloading optimized ngrok binary for ${ARCH}...${NC}"
  curl -sSL "$NGROK_DL_URL" -o server/bin/ngrok.tgz 2>/dev/null || true
  if [ -f "server/bin/ngrok.tgz" ]; then
    tar -xzf server/bin/ngrok.tgz -C server/bin/ 2>/dev/null || true
    rm -f server/bin/ngrok.tgz
    chmod +x server/bin/ngrok 2>/dev/null || true
    echo -e "${GREEN}[✔] Native ngrok binary installed.${NC}"
  fi
fi

# 8. Generate Start & Background Scripts
cat <<'EOF' > start.sh
#!/usr/bin/env bash
cd "$(dirname "$0")"
if command -v termux-wake-lock &>/dev/null; then
  termux-wake-lock
fi
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi
echo "========================================================="
echo "   🚀 Starting PhoneLink Hub Server..."
echo "========================================================="
exec node server/src/index.js
EOF
chmod +x start.sh

cat <<'EOF' > start-bg.sh
#!/usr/bin/env bash
cd "$(dirname "$0")"
if command -v termux-wake-lock &>/dev/null; then
  termux-wake-lock
fi
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi
nohup node server/src/index.js > server.log 2>&1 &
PID=$!
echo "========================================================="
echo "   🟢 PhoneLink Hub is now running in the background!"
echo "   Process ID (PID): $PID"
echo "   View logs anytime with: tail -f server.log"
echo "   Stop server with: ./stop.sh"
echo "========================================================="
EOF
chmod +x start-bg.sh

cat <<'EOF' > stop.sh
#!/usr/bin/env bash
echo "Stopping PhoneLink Hub..."
pkill -f "node server/src/index.js" || true
pkill -f "ngrok http" || true
echo "PhoneLink Hub stopped."
EOF
chmod +x stop.sh

# Find local IP
LOCAL_IP="localhost"
if command -v ip &>/dev/null; then
  LOCAL_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -n 1 || echo "localhost")
elif command -v ifconfig &>/dev/null; then
  LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1 || echo "localhost")
fi

# 9. Installation Complete Banner
echo -e "\n${GREEN}${BOLD}====================================================================="
echo "   🎉   I N S T A L L A T I O N   S U C C E S S F U L ! "
echo "=====================================================================${NC}"
echo -e "${WHITE}Your PhoneLink Hub server is ready to run 24/7!${NC}\n"
echo -e "${BOLD}Dashboard Access Details:${NC}"
echo -e "  • Local Wi-Fi URL  : ${CYAN}http://${LOCAL_IP}:${CFG_PORT}${NC}"
echo -e "  • Dashboard PIN    : ${YELLOW}${CFG_PIN}${NC}"
echo -e "  • License Status   : ${YELLOW}Activate via Web Dashboard License popup${NC}"

if [ -n "$CFG_NGROK_TOKEN" ]; then
  echo -e "  • Ngrok Remote     : ${GREEN}Autostart Enabled (Check URL on startup or Dashboard)${NC}"
else
  echo -e "  • Ngrok Remote     : ${YELLOW}Not configured (Add token anytime in Dashboard Settings)${NC}"
fi

echo -e "\n${BOLD}Commands:${NC}"
echo -e "  • Start Foreground : ${CYAN}./start.sh${NC}"
echo -e "  • Start Background : ${CYAN}./start-bg.sh${NC} (Leaves phone screen off, runs 24/7)"
echo -e "  • View Live Logs   : ${CYAN}tail -f server.log${NC}"
echo -e "  • Stop Server      : ${CYAN}./stop.sh${NC}"

echo -e "\n${YELLOW}Would you like to start the PhoneLink Hub server now? (y/n)${NC}"
read -rp "> " START_NOW
if [[ "$START_NOW" =~ ^[Yy]$ ]]; then
  echo -e "${GREEN}Starting server now... Press Ctrl+C to stop.${NC}\n"
  ./start.sh
fi

