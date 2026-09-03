# syntax=docker/dockerfile:1.7
FROM php:8.4.14-fpm-bookworm AS php-base

ARG REDIS_VERSION=6.2.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev libzip-dev unzip \
    && docker-php-ext-install -j"$(nproc)" pcntl pdo_pgsql zip \
    && pecl install redis-${REDIS_VERSION} \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*

COPY infrastructure/docker/api/php.ini /usr/local/etc/php/conf.d/aqualino.ini
WORKDIR /app

FROM php-base AS vendor-base
COPY --from=composer:2.8.12 /usr/bin/composer /usr/bin/composer
COPY apps/api/composer.json apps/api/composer.lock ./

FROM vendor-base AS vendor-production
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts \
    && composer clear-cache

FROM vendor-base AS vendor-development
RUN composer install --prefer-dist --no-interaction --no-progress --no-scripts \
    && composer clear-cache

FROM php-base AS production
COPY --chown=www-data:www-data apps/api /app
COPY --from=vendor-production --chown=www-data:www-data /app/vendor /app/vendor
RUN touch .env \
    && php -r "require 'vendor/autoload.php';" \
    && chown -R www-data:www-data storage bootstrap/cache
USER www-data
CMD ["php-fpm", "-F"]

FROM php-base AS development
ENV APP_ENV=local
COPY --chown=www-data:www-data apps/api /app
COPY --from=vendor-development --chown=www-data:www-data /app/vendor /app/vendor
RUN touch .env \
    && chown -R www-data:www-data storage bootstrap/cache
USER www-data
CMD ["php-fpm", "-F"]
