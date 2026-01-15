#!/bin/bash
# setup-https.sh - Set up HTTPS certificates for GoGoGadgetClaude
#
# This script helps you set up HTTPS certificates so voice input works on iOS Safari.
# There are two methods:
#   1. Tailscale HTTPS (recommended) - Uses Let's Encrypt certs via Tailscale
#   2. mkcert (local development) - Creates locally-trusted certificates

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="$PROJECT_ROOT/certs"

echo "🔒 GoGoGadgetClaude HTTPS Setup"
echo "================================"
echo ""

# Check which method to use
echo "Choose a method to generate HTTPS certificates:"
echo ""
echo "  1) Tailscale HTTPS (recommended)"
echo "     - Uses Let's Encrypt certificates via Tailscale"
echo "     - Works seamlessly with your Tailscale hostname"
echo "     - Certificates auto-renew"
echo ""
echo "  2) mkcert (local development)"
echo "     - Creates locally-trusted development certificates"
echo "     - Requires installing the CA on your iPhone"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
  1)
    echo ""
    echo "📡 Tailscale HTTPS Setup"
    echo "------------------------"
    
    # Check if Tailscale is installed
    if ! command -v tailscale &> /dev/null; then
      echo "❌ Tailscale is not installed. Please install it first:"
      echo "   brew install tailscale"
      exit 1
    fi
    
    # Get Tailscale hostname
    TAILSCALE_STATUS=$(tailscale status --json 2>/dev/null || echo "{}")
    TAILSCALE_HOSTNAME=$(echo "$TAILSCALE_STATUS" | grep -o '"DNSName":"[^"]*"' | head -1 | cut -d'"' -f4 | sed 's/\.$//')
    
    if [ -z "$TAILSCALE_HOSTNAME" ]; then
      echo "⚠️  Could not detect Tailscale hostname automatically."
      read -p "Enter your Tailscale hostname (e.g., dereks-macbook-pro.tailnet-name.ts.net): " TAILSCALE_HOSTNAME
    else
      echo "✅ Detected Tailscale hostname: $TAILSCALE_HOSTNAME"
      read -p "Is this correct? (Y/n): " confirm
      if [[ $confirm == "n" || $confirm == "N" ]]; then
        read -p "Enter your Tailscale hostname: " TAILSCALE_HOSTNAME
      fi
    fi
    
    # Create certs directory
    mkdir -p "$CERTS_DIR"
    
    echo ""
    echo "Generating certificates for $TAILSCALE_HOSTNAME..."
    echo ""
    
    # Generate certificates using Tailscale
    # Note: This requires HTTPS to be enabled in your Tailscale admin console
    cd "$CERTS_DIR"
    if tailscale cert "$TAILSCALE_HOSTNAME" 2>/dev/null; then
      echo "✅ Certificates generated successfully!"
      
      # Tailscale creates files named after the hostname
      CERT_FILE="$CERTS_DIR/${TAILSCALE_HOSTNAME}.crt"
      KEY_FILE="$CERTS_DIR/${TAILSCALE_HOSTNAME}.key"
      
      echo ""
      echo "📁 Certificate files:"
      echo "   Cert: $CERT_FILE"
      echo "   Key:  $KEY_FILE"
    else
      echo ""
      echo "❌ Failed to generate certificates."
      echo ""
      echo "This usually means HTTPS certificates are not enabled in your Tailscale admin console."
      echo ""
      echo "To enable HTTPS certificates:"
      echo "  1. Go to https://login.tailscale.com/admin/dns"
      echo "  2. Enable 'HTTPS Certificates'"
      echo "  3. Run this script again"
      echo ""
      exit 1
    fi
    ;;
    
  2)
    echo ""
    echo "🔐 mkcert Setup"
    echo "---------------"
    
    # Check if mkcert is installed
    if ! command -v mkcert &> /dev/null; then
      echo "Installing mkcert..."
      if command -v brew &> /dev/null; then
        brew install mkcert nss
      else
        echo "❌ mkcert is not installed and Homebrew is not available."
        echo "   Please install mkcert manually: https://github.com/FiloSottile/mkcert"
        exit 1
      fi
    fi
    
    # Install the local CA
    echo "Installing local CA (you may be prompted for your password)..."
    mkcert -install
    
    # Get hostname to generate certs for
    echo ""
    read -p "Enter the hostname to generate certs for (e.g., dereks-macbook-pro.tailnet-name.ts.net): " HOSTNAME
    
    if [ -z "$HOSTNAME" ]; then
      HOSTNAME="localhost"
    fi
    
    # Create certs directory
    mkdir -p "$CERTS_DIR"
    cd "$CERTS_DIR"
    
    # Generate certificates
    echo "Generating certificates for $HOSTNAME..."
    mkcert -cert-file "$HOSTNAME.crt" -key-file "$HOSTNAME.key" "$HOSTNAME" localhost 127.0.0.1
    
    CERT_FILE="$CERTS_DIR/${HOSTNAME}.crt"
    KEY_FILE="$CERTS_DIR/${HOSTNAME}.key"
    
    echo ""
    echo "✅ Certificates generated successfully!"
    echo ""
    echo "📁 Certificate files:"
    echo "   Cert: $CERT_FILE"
    echo "   Key:  $KEY_FILE"
    
    echo ""
    echo "⚠️  IMPORTANT: To use voice input on your iPhone:"
    echo "   1. Copy the CA certificate to your iPhone:"
    echo "      - Run: mkcert -CAROOT"
    echo "      - AirDrop the 'rootCA.pem' file to your iPhone"
    echo "   2. On iPhone: Settings > General > VPN & Device Management"
    echo "   3. Install and trust the certificate"
    ;;
    
  *)
    echo "Invalid choice. Please run the script again and choose 1 or 2."
    exit 1
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Add the following to your .env file:"
echo ""
echo "   SSL_CERT_PATH=$CERT_FILE"
echo "   SSL_KEY_PATH=$KEY_FILE"
echo ""
echo "2. Restart the server:"
echo ""
echo "   pnpm dev"
echo ""
echo "3. Access the app via HTTPS (same port as before!):"
echo ""
echo "   https://${TAILSCALE_HOSTNAME:-$HOSTNAME}:3456"
echo ""
echo "   Voice input will now work on iOS Safari! 🎤"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

