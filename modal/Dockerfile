# GoGoGadgetClaude - Claude Execution Container
#
# This Dockerfile creates a container image for running Claude Code in the cloud.
# It includes:
#   - Node.js 20 (required for Claude CLI)
#   - Claude CLI (@anthropic-ai/claude-code)
#   - Git (for cloning repositories)
#   - Python 3.11 (for Modal integration)
#
# Build:
#   docker build -t gogogadget-claude .
#
# Run (for testing):
#   docker run -it -e ANTHROPIC_API_KEY=sk-ant-... gogogadget-claude claude --version
#
# Note: In production, Modal builds this image automatically from modal_app.py.
#       This Dockerfile is primarily for local testing and documentation.

FROM python:3.11-slim-bookworm

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Verify Node.js installation
RUN node --version && npm --version

# Install Claude CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Verify Claude CLI installation
RUN claude --version || echo "Claude CLI installed (version check may require API key)"

# Install Python dependencies for Modal
RUN pip install --no-cache-dir \
    modal \
    fastapi[standard]

# Create directories for Claude data
RUN mkdir -p /root/.claude/projects

# Set working directory
WORKDIR /workspace

# Default command (can be overridden)
CMD ["bash"]

# =============================================================================
# Usage Examples
# =============================================================================
#
# Build the image:
#   docker build -t gogogadget-claude -f modal/Dockerfile .
#
# Run Claude with a prompt:
#   docker run -it \
#     -e ANTHROPIC_API_KEY=sk-ant-... \
#     -v /path/to/repo:/workspace \
#     gogogadget-claude \
#     claude -p "Your prompt here" --allowedTools Task,Bash,Read,Write
#
# Interactive shell:
#   docker run -it \
#     -e ANTHROPIC_API_KEY=sk-ant-... \
#     gogogadget-claude \
#     bash
#
# Test the container:
#   docker run --rm gogogadget-claude node --version
#   docker run --rm gogogadget-claude claude --help
#
# =============================================================================


