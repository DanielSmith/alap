FROM python:3.12-slim

WORKDIR /app

COPY fastapi-postgres/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /shared/
COPY fastapi-postgres/ .

EXPOSE 3000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "3000"]
