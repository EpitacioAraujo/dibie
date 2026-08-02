# Imagem de dev/execução da API: PHP 8.3 CLI com extensões p/ Laravel + Postgres.
FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
      libpq-dev libonig-dev libzip-dev unzip \
    && docker-php-ext-install pdo_pgsql mbstring zip bcmath \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
