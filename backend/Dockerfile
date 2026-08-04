# Imagem self-contained da API: PHP 8.3 CLI + extensões Laravel/Postgres + vendor embutido.
FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
      libpq-dev libonig-dev libzip-dev unzip \
    && docker-php-ext-install pdo_pgsql mbstring zip bcmath \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY . .
# ponytail: COPY . . invalida cache a cada mudança de fonte; separar composer.json
#   e usar --no-scripts+dump-autoload otimiza o build se ele ficar lento.
RUN composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
