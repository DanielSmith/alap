# php:8.4-cli
FROM php:8.4-cli@sha256:4ef9e46d3a02816c84bfc0118ba6361e75b77db4b4d6f2915cef9b6cc14a3446

WORKDIR /app

# Install SQLite extension
RUN apt-get update && apt-get install -y libsqlite3-dev unzip \
    && docker-php-ext-install pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
# composer:2
COPY --from=composer:2@sha256:743aebe48ca67097c36819040633ea77e44a561eca135e4fc84c002e63a1ba07 /usr/bin/composer /usr/bin/composer

# Install dependencies
COPY composer.json ./
RUN composer install --no-dev --optimize-autoloader

# Copy application and regenerate autoloader
COPY . .
RUN composer dump-autoload --optimize

# Ensure bootstrap/cache exists (empty dirs aren't tracked by git)
RUN mkdir -p bootstrap/cache

# Create .env from example if not present, then migrate and seed
# APP_KEY is generated at runtime via entrypoint — do not bake into image
RUN cp -n .env.example .env || true \
    && php artisan migrate --force \
    && php artisan db:seed --force

EXPOSE 3000

RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser
CMD ["sh", "-c", "php artisan key:generate --force --quiet && php artisan serve --host=0.0.0.0 --port=3000"]
