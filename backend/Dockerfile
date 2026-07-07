FROM python:3.11-slim
LABEL "language"="python"
LABEL "framework"="fastapi"

ARG BUILD_GIT_SHA=""
ENV BUILD_GIT_SHA=${BUILD_GIT_SHA}
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# Install Python dependencies and the Chromium runtime before switching to the
# non-root app user so the browser cache stays readable at runtime.
# COPY paths are relative to the repo root: the production Zeabur build uses
# the repository root as its context even though this file lives in backend/.
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install --with-deps chromium \
    && apt-get update \
    && apt-get install -y --no-install-recommends fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/* \
    && chmod -R a+rX /ms-playwright

# Copy application code
COPY backend/ .

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser
USER appuser

# Expose port
EXPOSE 8001

# Run the application
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
