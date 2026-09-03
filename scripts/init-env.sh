#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  cp .env.example .env
fi

if grep -q '^APP_KEY=$' .env; then
  aqualino_key="base64:$(openssl rand -base64 32)"
  sed -i "s|^APP_KEY=$|APP_KEY=${aqualino_key}|" .env
fi

chmod 600 .env
