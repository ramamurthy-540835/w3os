# W3 Desktop - Simple Production Dockerfile
FROM node:22-bookworm-slim

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NEXT_TELEMETRY_DISABLED=1
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Install system dependencies (all in one layer to reduce size)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
    libasound2 libwayland-client0 fonts-liberation fonts-noto-color-emoji \
    fonts-noto-cjk python3 python3-pip python3-venv git build-essential \
    curl vim-tiny nano wget ca-certificates procps htop net-tools zip unzip \
    sqlite3 jq tree sed gawk grep openjdk-17-jre-headless && \
    rm -rf /var/lib/apt/lists/*

# Setup Python with essential packages and create .bashrc with aliases
RUN ln -s /usr/bin/python3 /usr/bin/python && \
    pip3 install --break-system-packages --no-cache-dir \
    google-genai \
    numpy pandas matplotlib seaborn plotly \
    requests flask fastapi httpx uvicorn \
    google-cloud-bigquery google-cloud-storage \
    db-dtypes pyarrow openpyxl xlsxwriter \
    scikit-learn scipy pyspark && \
    printf 'alias python=python3\nalias pip=pip3\nalias ll="ls -la"\nalias la="ls -A"\n' > /tmp/.w3bashrc

# Add gemini command-line tool
RUN printf '#!/usr/bin/env python3\nfrom google import genai\nimport sys, os\n\nclient = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))\n\nif len(sys.argv) > 1:\n    prompt = " ".join(sys.argv[1:])\nelse:\n    prompt = input("Ask Gemini: ")\n\nresponse = client.models.generate_content(\n    model="gemini-2.0-flash",\n    contents=prompt\n)\nprint(response.text)\n' > /usr/local/bin/gemini && chmod +x /usr/local/bin/gemini

# Add gemini-code script for code generation and file saving
RUN printf '#!/usr/bin/env python3\nfrom google import genai\nimport sys, os\n\nclient = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))\n\nprompt = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else input("Describe what to build: ")\n\nresponse = client.models.generate_content(\n    model="gemini-2.0-flash",\n    contents=f"Generate ONLY the code, no explanation. Project: {prompt}"\n)\n\ncode = response.text\n# Extract code from markdown blocks\nif "```" in code:\n    blocks = code.split("```")\n    for i, block in enumerate(blocks):\n        if i %% 2 == 1:  # Inside code block\n            lines = block.strip().split("\\n")\n            lang = lines[0].strip()\n            content = "\\n".join(lines[1:]) if lang in ["python","javascript","typescript","html","css","sql","bash","jsx","tsx"] else "\\n".join(lines)\n            ext = {"python":".py","javascript":".js","typescript":".ts","html":".html","css":".css","sql":".sql","bash":".sh","jsx":".jsx","tsx":".tsx"}.get(lang, ".txt")\n            filename = f"generated{ext}"\n            with open(filename, "w") as f:\n                f.write(content)\n            print(f"Saved: {filename}")\n            print(content[:500])\nelse:\n    print(code)\n' > /usr/local/bin/gemini-code && chmod +x /usr/local/bin/gemini-code

# Install Google Cloud SDK
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-transport-https ca-certificates gnupg curl \
    && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list \
    && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg \
    && apt-get update && apt-get install -y --no-install-recommends google-cloud-cli \
    && rm -rf /var/lib/apt/lists/*

# Create w3info helper script
RUN printf '#!/bin/bash\necho "W3 Cloud OS - GCP Tools"\necho "========================"\necho "gcloud: $(gcloud version 2>/dev/null | head -1 || echo not installed)"\necho "gsutil: $(gsutil version 2>/dev/null | head -1 || echo not installed)"\necho "bq: $(bq version 2>/dev/null | head -1 || echo not installed)"\necho "python3: $(python3 --version)"\necho "node: $(node --version)"\necho ""\necho "Project: ${GCS_PROJECT:-not set}"\necho "Bucket: ${GCS_BUCKET:-not set}"\necho "Gemini: $([ -n \"$GEMINI_API_KEY\" ] && echo configured || echo not configured)"\n' > /usr/local/bin/w3info && chmod +x /usr/local/bin/w3info

# Copy and install dependencies
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Download Playwright chromium
RUN npx playwright install chromium 2>&1 | tail -5

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Create non-root user
RUN groupadd -g 1001 nextjs && \
    useradd -u 1001 -g nextjs -m nextjs && \
    chown -R nextjs:nextjs /ms-playwright && \
    chown -R nextjs:nextjs /app

USER nextjs

# Expose and run
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "server.js"]
