# python:3.13-slim
FROM python:3.13-slim@sha256:739e7213785e88c0f702dcdc12c0973afcbd606dbf021a589cab77d6b00b579d

WORKDIR /app

COPY django-sqlite/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /shared/
COPY django-sqlite/ .

RUN python manage.py migrate --run-syncdb && python seed.py

RUN adduser --disabled-password --gecos '' appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 3000

CMD ["python", "manage.py", "runserver", "0.0.0.0:3000"]
