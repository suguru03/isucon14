FROM php:8.3.13-fpm-bullseye

WORKDIR /tmp
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get clean \
    && apt-get update \
    && apt-get install -y locales \
    && apt-get install language-pack-en

RUN docker-php-ext-install pdo_mysql

RUN locale-gen en_US.UTF-8
RUN useradd --uid=1001 --create-home isucon
USER isucon

WORKDIR /home/isucon/webapp/php
COPY --chown=isucon:isucon ./ /home/isucon/webapp/php/

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

ENV TZ utc
