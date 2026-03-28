# python:3.13-slim
FROM python:3.13-slim@sha256:739e7213785e88c0f702dcdc12c0973afcbd606dbf021a589cab77d6b00b579d

WORKDIR /app

COPY fastapi-postgres/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /shared/
COPY fastapi-postgres/ .

EXPOSE 3000

RUN adduser --disabled-password --gecos '' appuser && chown -R appuser:appuser /app
USER appuser
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "3000"]
