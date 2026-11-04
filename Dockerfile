# Production Dockerfile for PromptShield
FROM node:20-alpine

# Add metadata
LABEL maintainer="PromptShield Team"
LABEL description="PromptShield - LLM Security Scanner"


# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy application files
COPY dist/ ./dist/
COPY bin/ ./bin/
COPY rulepacks/ ./rulepacks/

# Make binary executable
RUN chmod +x bin/promptshield

# Create non-root user
RUN addgroup -g 1001 -S promptshield && \
    adduser -S promptshield -u 1001 -G promptshield

# Create directory for user files
RUN mkdir -p /data && chown promptshield:promptshield /data

# Switch to non-root user
USER promptshield

# Set default working directory for scanning
WORKDIR /data

# Add binary to PATH
ENV PATH="/app/bin:${PATH}"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD promptshield --version || exit 1

# Default command
ENTRYPOINT ["promptshield"]
CMD ["--help"]
