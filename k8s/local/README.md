# Local Kubernetes manifests

Postgres and Redis for a local `kind` cluster — see the main README's
"Deploy to Kubernetes" section for the full walkthrough.

## Before applying postgres.yaml

`postgres.yaml` deliberately does **not** define the `postgres-secret` it
references — no password belongs in a file that's going to GitHub. Create
it yourself first, from the same `.env` you already have at the repo root:

```bash
source ../../.env
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_PASSWORD="$DB_PASSWORD"
```

Then:

```bash
kubectl apply -f postgres.yaml
kubectl apply -f redis.yaml
```

If you ever delete and recreate the cluster, you'll need to recreate this
secret too — `kubectl create secret` isn't declarative/idempotent against a
YAML file here by design, it's a deliberate manual step so there's no
temptation to put a real password in a committed file "just for now."
