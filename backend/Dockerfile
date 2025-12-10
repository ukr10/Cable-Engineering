FROM python:3.12-slim

WORKDIR /app

# Install build deps for psycopg2 if needed
RUN apt-get update && apt-get install -y --no-install-recommends build-essential gcc libpq-dev ca-certificates && rm -rf /var/lib/apt/lists/*

COPY ./backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY ./backend /app

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
