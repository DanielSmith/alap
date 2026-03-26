FROM python:3.12-slim

WORKDIR /app

COPY django-sqlite/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /shared/
COPY django-sqlite/ .

RUN python manage.py migrate --run-syncdb && python seed.py

EXPOSE 3000

CMD ["python", "manage.py", "runserver", "0.0.0.0:3000"]
