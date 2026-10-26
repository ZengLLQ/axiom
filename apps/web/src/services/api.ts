import { ExperimentConfig, ExperimentRecord, EvaluationResult, SystemCapabilities, EquationTemplate } from '../types';

const API_BASE = '/api/v1';

export async function fetchHealth(): Promise<{ status: string; service: string; version: string; juliaVersion: string }> {
  const res = await fetch('/health');
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchCapabilities(): Promise<SystemCapabilities> {
  const res = await fetch(`${API_BASE}/capabilities`);
  if (!res.ok) throw new Error(`Failed to fetch capabilities: ${res.statusText}`);
  return res.json();
}

export async function fetchEquations(): Promise<EquationTemplate[]> {
  const res = await fetch(`${API_BASE}/equations`);
  if (!res.ok) throw new Error(`Failed to fetch equations: ${res.statusText}`);
  return res.json();
}

export async function fetchExperiments(): Promise<ExperimentRecord[]> {
  const res = await fetch(`${API_BASE}/experiments`);
  if (!res.ok) throw new Error(`Failed to fetch experiments: ${res.statusText}`);
  return res.json();
}

export async function fetchExperiment(id: string): Promise<ExperimentRecord> {
  const res = await fetch(`${API_BASE}/experiments/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch experiment ${id}: ${res.statusText}`);
  return res.json();
}

export async function createExperiment(config: ExperimentConfig): Promise<ExperimentRecord> {
  const res = await fetch(`${API_BASE}/experiments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`Failed to create experiment: ${res.statusText}`);
  return res.json();
}

export async function startExperiment(id: string): Promise<{ message: string; id: string; status: string }> {
  const res = await fetch(`${API_BASE}/experiments/${id}/start`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to start experiment: ${res.statusText}`);
  return res.json();
}

export async function stopExperiment(id: string): Promise<{ message: string; id: string; status: string }> {
  const res = await fetch(`${API_BASE}/experiments/${id}/stop`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to stop experiment: ${res.statusText}`);
  return res.json();
}

export async function quickSolveExperiment(config: ExperimentConfig): Promise<{ experiment: ExperimentRecord; result: EvaluationResult }> {
  const res = await fetch(`${API_BASE}/experiments/quick-solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`Failed to quick-solve: ${res.statusText}`);
  return res.json();
}

export async function runInverseEstimation(config: {
  trueValue: number;
  initialGuess: number;
  sensorCount: number;
  noiseStd: number;
  steps: number;
  learningRate: number;
  seed: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/inverse/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`Failed to run inverse estimation: ${res.statusText}`);
  return res.json();
}

export function subscribeToEvents(expId: string, onMessage: (event: any) => void, onError?: (err: any) => void): () => void {
  const eventSource = new EventSource(`${API_BASE}/experiments/${expId}/events`);
  
  eventSource.addEventListener('TRAINING_STEP', (e) => {
    try {
      const parsed = JSON.parse(e.data);
      onMessage({ type: 'TRAINING_STEP', data: parsed.data });
    } catch (err) {
      console.error('Error parsing SSE event:', err);
    }
  });

  eventSource.addEventListener('STATUS_CHANGE', (e) => {
    try {
      const parsed = JSON.parse(e.data);
      onMessage({ type: 'STATUS_CHANGE', data: parsed.data });
    } catch (err) {
      console.error('Error parsing SSE event:', err);
    }
  });

  eventSource.addEventListener('EXPERIMENT_COMPLETED', (e) => {
    try {
      const parsed = JSON.parse(e.data);
      onMessage({ type: 'EXPERIMENT_COMPLETED', data: parsed.data });
    } catch (err) {
      console.error('Error parsing SSE event:', err);
    }
  });

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}
