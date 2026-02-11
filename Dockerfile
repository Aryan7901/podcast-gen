# ─────────────────────────────────────────────────────────────
# STAGE 1: The Builder (Heavy)
# ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Disable pip cache to keep the build stage lean
ENV PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /build

# Install build tools only if your dependencies need to compile C extensions
# RUN apt-get update && apt-get install -y --no-install-recommends gcc python3-dev

COPY requirements.txt .

# Install dependencies into a separate folder (/install)
# This prevents the final image from carrying over pip's internal cache
RUN pip install --prefix=/install -r requirements.txt

# ─────────────────────────────────────────────────────────────
# STAGE 2: The Runtime (Lightweight)
# ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Set environment variables for better performance on N100
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/usr/local/bin:$PATH"

WORKDIR /app

# 1. Security: Run as a non-root user (Standard 2026 practice)
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -m -s /bin/bash appuser

# 2. Optimization: Copy only the installed packages from the builder
# This skips all the source code and cache files from the build stage
COPY --from=builder /install /usr/local

# 3. Copy only the necessary application files
COPY . .

# 4. Ownership & Permissions
RUN chown -R appuser:appgroup /app
USER appuser

# Expose FastAPI/Uvicorn port
EXPOSE 8010

# 5. Execution Logic for N100 (4 Physical Cores / 0 Hyperthreading)
# We set workers to 4 so each efficiency core handles one process.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8010", "--workers", "1"]