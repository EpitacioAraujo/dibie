# Imagem self-contained da API: PHP 8.3 CLI + extensões Laravel/Postgres + vendor embutido.
FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
      libpq-dev libonig-dev libzip-dev unzip \
    && docker-php-ext-install pdo_pgsql mbstring zip bcmath \
    && rm -rf /var/lib/apt/lists/*

# O default do PHP (2M) derruba upload de foto antes da validação do Laravel: o
# arquivo some e a request volta 422 "imagem obrigatória". post_max_size também
# segura o data URI do render de mockup (validado em 7M).
RUN printf 'upload_max_filesize=16M\npost_max_size=20M\n' > "$PHP_INI_DIR/conf.d/uploads.ini"

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY . .
# ponytail: COPY . . invalida cache a cada mudança de fonte; separar composer.json
#   e usar --no-scripts+dump-autoload otimiza o build se ele ficar lento.
RUN composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
