# Nezha Admin Frontend

## Bootstrap

```bash
npx swagger-typescript-api -p http://localhost:8008/swagger/doc.json -o ./src/types -n api.ts --no-client --union-enums
```

## End-to-end tests

Playwright suite lives in `tests/e2e/` and runs in CI via
`.github/workflows/e2e.yml`. The workflow checks out the backend
(`nezhahq/nezha` master), starts it on `127.0.0.1:8008`, then runs
`npm run e2e` here.

### Run locally

First install browsers once:

```bash
npm run e2e:install
```

Then start the backend separately. The shape the CI workflow uses is:

```bash
# in a checkout of nezhahq/nezha
mkdir -p cmd/dashboard/admin-dist cmd/dashboard/user-dist
printf '<!doctype html><title>admin e2e</title>\n' > cmd/dashboard/admin-dist/index.html
printf '<!doctype html><title>user e2e</title>\n' > cmd/dashboard/user-dist/index.html
go install github.com/swaggo/swag/cmd/swag@latest
"$(go env GOPATH)/bin/swag" init --pd -d cmd/dashboard -g main.go -o cmd/dashboard/docs

NZ_LISTENHOST=127.0.0.1 NZ_LISTENPORT=8008 \
  NZ_JWTSECRETKEY=e2e-jwt-secret-key-min-32-chars-long-ok \
  NZ_AGENTSECRETKEY=e2e-agent-secret-32-bytes-long-ok \
  NZ_SITENAME=nezha-e2e GIN_MODE=release \
  go run ./cmd/dashboard -c data/config.yaml -db data/sqlite.db
```

Then back in this repo:

```bash
npm run e2e            # Vite dev server starts automatically
npm run e2e -- --ui    # interactive runner for debugging
```

### Reusing a running stack

If you already have Vite (`npm run dev`) and the backend up:

```bash
E2E_SKIP_WEBSERVER=1 E2E_BASE_URL=http://localhost:5173 npm run e2e
```

Override credentials for a non-default admin account with `E2E_ADMIN_USER`
and `E2E_ADMIN_PASS`.

### Triaging a CI failure

The workflow uploads two artifacts on failure:

- `playwright-report` — HTML report; open `index.html` locally.
- `dashboard-log` — full backend stdout/stderr for the test run.
