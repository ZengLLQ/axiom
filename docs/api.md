# Axiom REST API Specification (v1)

Base URL: `http://localhost:8080/api/v1`

All responses follow JSON API conventions. Cross-Origin Resource Sharing (CORS) is enabled with standard pre-flight `OPTIONS` handling.

---

## 1. System Endpoints

### `GET /health` or `GET /api/v1/health`
Returns system status, service version, and Julia runtime version.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "Axiom Scientific AI Laboratory",
  "version": "1.0.0",
  "juliaVersion": "1.13.3",
  "timestamp": "2026-10-26T20:50:00.123"
}
```

### `GET /api/v1/capabilities`
Returns supported equation models, available compute backends, precision modes, and active hardware details.

---

## 2. Equation Library

### `GET /api/v1/equations`
Returns an array of registered mathematical templates (`heat_1d`, `burgers_1d`, `wave_1d`, `harmonic_oscillator`) with parameter schemas, boundary types, and reference solver strategies.

### `GET /api/v1/equations/{equation_id}`
Returns details for a specific equation template.

---

## 3. Experiment Lifecycle

### `GET /api/v1/experiments`
Lists all recorded experiments with their configuration, timestamps, execution statuses, and key summary metrics.

### `POST /api/v1/experiments`
Creates a new experiment record in `draft` status.
**Payload:**
```json
{
  "name": "Heat1D-Run",
  "equationId": "heat_1d",
  "parameters": { "alpha": 0.1 },
  "domain": { "xMin": 0.0, "xMax": 1.0, "tMin": 0.0, "tMax": 1.0 },
  "network": { "layers": [2, 32, 32, 1], "activation": "tanh" },
  "training": { "steps": 200, "learningRate": 0.005, "collocationPoints": 400, "seed": 42 },
  "evaluation": { "gridX": 25, "gridT": 25 }
}
```

### `POST /api/v1/experiments/{id}/start`
Starts training in the background. Emits live SSE events to connected clients.

### `POST /api/v1/experiments/{id}/stop`
Signals cooperative cancellation to the active optimizer task and marks the experiment as `stopped`.

### `POST /api/v1/experiments/quick-solve`
Executes training synchronously for interactive studio sweeps, returns both the created experiment record and the full scientific evaluation result.

### `GET /api/v1/experiments/{id}/result`
Retrieves full evaluation arrays (`predicted`, `reference`, `absoluteError`, `residualField`), time slices, and validation criteria.

---

## 4. Real-time Telemetry (SSE)

### `GET /api/v1/experiments/{id}/events`
Server-Sent Events (SSE) stream.
- Event: `CONNECTED` — Initial connection handshake.
- Event: `TRAINING_STEP` — Telemetry point `{ "step": 50, "total": 0.012, "residual": 0.008, "boundary": 0.002, "initial": 0.002 }`.
- Event: `STATUS_CHANGE` — Status update (`running`, `stopped`, `failed`).
- Event: `EXPERIMENT_COMPLETED` — Final evaluation payload.

---

## 5. Artifacts & Reproducibility Exports

- `GET /api/v1/experiments/{id}/export/julia`: Downloads a self-contained, standalone executable Julia script that reproduces the experiment from scratch.
- `GET /api/v1/experiments/{id}/export/json`: Downloads the full machine-readable reproducibility manifest.
- `GET /api/v1/experiments/{id}/export/csv`: Downloads tabular evaluation data across the spacetime grid `(t, x, u_pred, u_ref, abs_error, residual)`.

---

## 6. Inverse Problems

### `POST /api/v1/inverse/estimate`
Estimates unknown physical parameters (e.g. thermal diffusivity $\alpha$) from sparse, noisy synthetic sensor data using simultaneous PINN loss minimization.
