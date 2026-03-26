FROM python:3.12-slim

WORKDIR /app

COPY flask-sqlite/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /shared/
COPY flask-sqlite/ .

RUN python seed.py

ENV FLASK_APP=server.py

EXPOSE 3000

CMD ["flask", "run", "--host=0.0.0.0", "--port=3000"]
