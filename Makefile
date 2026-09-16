# =============================================================================
# CrypCal Makefile
# =============================================================================
# Usage:
#   make setup     — Generate secrets and configs
#   make up        — Start all services
#   make down      — Stop all services
#   make logs      — Tail service logs
#   make register  — Register a user (USER=name PASS=password)
#   make token     — Generate a registration token
#   make status    — Check service health
# =============================================================================

COMPOSE = docker compose -f infra/docker-compose.yml --env-file .env
SYNAPSE_CONTAINER = crypcal-synapse

.PHONY: setup up down logs register token status restart clean shell-synapse test lint typecheck build

# ---------------------------------------------------------------------------
# Client development & quality gates
# ---------------------------------------------------------------------------
test:
	cd apps/web && npm run test

lint:
	cd apps/web && npm run lint

typecheck:
	cd apps/web && npm run typecheck

build:
	cd apps/web && npm run build

# ---------------------------------------------------------------------------
# Setup: generate secrets and templated configs
# ---------------------------------------------------------------------------
setup:
ifeq ($(OS),Windows_NT)
	powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
else
	bash scripts/setup.sh
endif

# ---------------------------------------------------------------------------
# Docker Compose lifecycle
# ---------------------------------------------------------------------------
up:
	$(COMPOSE) up -d
	@echo ""
	@echo "CrypCal is starting. Run 'make status' to check health."
	@echo "Once healthy, access at: https://localhost"

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f --tail=100

status:
	$(COMPOSE) ps
	@echo ""
	@echo "Service health:"
	@docker inspect --format='{{.Name}}: {{.State.Health.Status}}' \
		crypcal-postgres crypcal-synapse crypcal-livekit 2>/dev/null || true

# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

# Register a new user (admin)
# Usage: make register USER=alice PASS=MySecurePassword123
register:
ifndef USER
	$(error USER is required. Usage: make register USER=alice PASS=secret)
endif
ifndef PASS
	$(error PASS is required. Usage: make register USER=alice PASS=secret)
endif
	docker exec -it $(SYNAPSE_CONTAINER) register_new_matrix_user \
		-u $(USER) -p $(PASS) -a -c /data/homeserver.yaml http://localhost:8008

# Register a non-admin user
register-user:
ifndef USER
	$(error USER is required. Usage: make register-user USER=bob PASS=secret)
endif
ifndef PASS
	$(error PASS is required. Usage: make register-user USER=bob PASS=secret)
endif
	docker exec -it $(SYNAPSE_CONTAINER) register_new_matrix_user \
		-u $(USER) -p $(PASS) --no-admin -c /data/homeserver.yaml http://localhost:8008

# Generate a registration token (for invite-only registration)
token:
	@echo "Generating registration token..."
	@docker exec $(SYNAPSE_CONTAINER) python -c "\
		import secrets; \
		token = secrets.token_urlsafe(24); \
		print(f'Registration token: {token}'); \
		print(f'Share this with the person you want to invite.')"
	@echo ""
	@echo "Note: To use this token, it must be added via the Synapse admin API."
	@echo "See: https://element-hq.github.io/synapse/latest/usage/administration/admin_api/registration_tokens.html"

# Create a registration token via the admin API
create-token:
	@docker exec $(SYNAPSE_CONTAINER) curl -s -X POST \
		'http://localhost:8008/_synapse/admin/v1/registration_tokens/new' \
		-H 'Content-Type: application/json' \
		-d '{"uses_allowed": 1}' \
		| python3 -m json.tool

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
clean:
	$(COMPOSE) down -v --remove-orphans
	rm -rf infra/synapse/generated infra/coturn/generated infra/livekit/generated
	rm -rf infra/coturn/certs infra/web-dist
	rm -f .env
	@echo "Cleaned all generated files and volumes."

# ---------------------------------------------------------------------------
# Debug
# ---------------------------------------------------------------------------
shell-synapse:
	docker exec -it $(SYNAPSE_CONTAINER) /bin/bash

shell-postgres:
	docker exec -it crypcal-postgres psql -U synapse -d synapse
