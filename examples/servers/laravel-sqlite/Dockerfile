FROM php:8.2-cli

WORKDIR /app

# Install SQLite extension
RUN apt-get update && apt-get install -y libsqlite3-dev unzip \
    && docker-php-ext-install pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install dependencies
COPY composer.json ./
RUN composer install --no-dev --optimize-autoloader

# Copy application and regenerate autoloader
COPY . .
RUN composer dump-autoload --optimize

# Create .env from example if not present, then generate key, migrate, seed
RUN cp -n .env.example .env || true \
    && php artisan key:generate \
    && php artisan migrate --force \
    && php artisan db:seed --force

EXPOSE 3000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=3000"]
