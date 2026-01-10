FROM python:3.11-slim
LABEL "language"="python"
LABEL "framework"="fastapi"

WORKDIR /app

# Install dependencies from backend directory
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code from backend directory
COPY backend/ .

# Expose port
EXPOSE 8001

# Run the application
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
