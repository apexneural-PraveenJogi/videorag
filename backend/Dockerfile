FROM python:3.12-slim

# ffmpeg is required by OpenCV frame extraction and faster-whisper audio decode.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV CHROMA_PERSIST_DIR=/data/chroma_db
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8072"]
