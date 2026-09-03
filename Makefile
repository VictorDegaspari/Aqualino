.PHONY: setup up down build migrate test-api test-mobile lint typecheck validate logs

setup:
	./scripts/init-env.sh
	docker compose up -d --build
	docker compose exec api php artisan migrate --seed

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

migrate:
	docker compose exec api php artisan migrate

test-api:
	docker compose run --rm api php artisan test

test-mobile:
	docker run --rm -u 1000:1000 -v $(CURDIR):/workspace -w /workspace node:22.19.0-bookworm corepack pnpm -r test

lint:
	docker compose run --rm api ./vendor/bin/pint --test
	docker run --rm -u 1000:1000 -v $(CURDIR):/workspace -w /workspace node:22.19.0-bookworm corepack pnpm -r lint

typecheck:
	docker run --rm -u 1000:1000 -v $(CURDIR):/workspace -w /workspace node:22.19.0-bookworm corepack pnpm -r typecheck

validate: test-api test-mobile lint typecheck

logs:
	docker compose logs -f api horizon scheduler nginx
