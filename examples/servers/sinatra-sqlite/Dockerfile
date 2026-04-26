# Build: podman build -t alap-sinatra -f examples/servers/sinatra-sqlite/Dockerfile .

FROM ruby:3.3-alpine

RUN apk add --no-cache build-base sqlite-dev

WORKDIR /app

COPY examples/servers/sinatra-sqlite/Gemfile ./
RUN bundle install --without development test

COPY src/other-languages/ruby/lib/ /app/lib/alap-parser/
COPY examples/servers/sinatra-sqlite/server.rb \
     examples/servers/sinatra-sqlite/seed.rb \
     examples/servers/sinatra-sqlite/config.ru ./
COPY examples/servers/sinatra-sqlite/public/ public/

# Patch the parser load path for container layout
RUN sed -i 's|^\$LOAD_PATH\.unshift(.*)|$LOAD_PATH.unshift("/app/lib/alap-parser")|' server.rb

RUN ruby seed.rb \
 && chown -R nobody:nobody /app

EXPOSE 3000

USER nobody
CMD ["ruby", "server.rb"]
