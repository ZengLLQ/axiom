import React, { useState, useEffect, useRef } from 'react';
import { 
  ExperimentRecord, 
  SystemCapabilities, 
  EquationTemplate, 
  ExperimentConfig, 
  TrainingMetricPoint 
} from '../types';
import { 
  fetchHealth, 
  fetchCapabilities, 
  fetchExperiments, 
  createExperiment, 
  startExperiment, 
  stopExperiment, 
  quickSolveExperiment, 
  subscribeToEvents 
} from '../services/api';
import { Navbar } from '../components/layout/Navbar';
import { OverviewView } from '../features/overview/OverviewView';
import { EquationLibraryView } from '../features/equation-library/EquationLibraryView';
import { ExperimentStudioView } from '../features/experiment-studio/ExperimentStudioView';
import { TrainingMonitorView } from '../features/training/TrainingMonitorView';
import { ResultsView } from '../features/results/ResultsView';
import { InverseProblemsView } from '../features/inverse-problems/InverseProblemsView';
import { BenchmarksView } from '../features/benchmarks/BenchmarksView';
import { ArtifactsView } from '../features/artifacts/ArtifactsView';
import { SettingsView } from '../features/settings/SettingsView';
import { EQUATION_TEMPLATES } from '../lib/equations';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentRecord | null>(null);
  const [selectedEquation, setSelectedEquation] = useState<EquationTemplate>(EQUATION_TEMPLATES['heat_1d']);

  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [health, setHealth] = useState<any | null>(null);

  // Live training state
  const [liveMetrics, setLiveMetrics] = useState<TrainingMetricPoint[]>([]);
  const [liveElapsedTime, setLiveElapsedTime] = useState<number>(0);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [isQuickSolving, setIsQuickSolving] = useState<boolean>(false);
  const [isStopping, setIsStopping] = useState<boolean>(false);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initial load
  const reloadData = async () => {
    try {
      const [h, cap, exps] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchCapabilities().catch(() => null),
        fetchExperiments().catch(() => []),
      ]);
      if (h) setHealth(h);
      if (cap) setCapabilities(cap);
      if (exps) setExperiments(exps);
    } catch (err) {
      console.error('Initial load failed:', err);
    }
  };

  useEffect(() => {
    reloadData();
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  const handleSelectExperiment = (exp: ExperimentRecord) => {
    setSelectedExperiment(exp);
    if (exp.status === 'running') {
      setActiveTab('training');
    } else {
      setActiveTab('results');
    }
  };

  const handleLaunchExperiment = async (config: ExperimentConfig) => {
    setIsLaunching(true);
    try {
      // 1. Create experiment record
      const created = await createExperiment(config);
      setSelectedExperiment(created);
      setLiveMetrics([]);
      setLiveElapsedTime(0);
      setActiveTab('training');

      // 2. Start background task
      await startExperiment(created.id);
      created.status = 'running';
      setExperiments((prev) => [created, ...prev]);

      // 3. Subscribe to Server-Sent Events (SSE)
      if (unsubscribeRef.current) unsubscribeRef.current();
      
      const unsub = subscribeToEvents(
        created.id,
        (event) => {
          if (event.type === 'TRAINING_STEP') {
            setLiveMetrics((prev) => [...prev, event.data]);
            if (event.data.elapsedTimeSec) {
              setLiveElapsedTime(event.data.elapsedTimeSec);
            }
          } else if (event.type === 'STATUS_CHANGE') {
            if (event.data.status === 'stopped' || event.data.status === 'failed') {
              created.status = event.data.status;
              setSelectedExperiment({ ...created });
              reloadData();
            }
          } else if (event.type === 'EXPERIMENT_COMPLETED') {
            created.status = 'completed';
            created.result = event.data;
            setSelectedExperiment({ ...created });
            setExperiments((prev) => prev.map((e) => (e.id === created.id ? created : e)));
            setActiveTab('results');
          }
        },
        (err) => {
          console.warn('SSE stream notice:', err);
        }
      );
      unsubscribeRef.current = unsub;
    } catch (err) {
      console.error('Launch failed:', err);
      alert('Failed to launch experiment: ' + (err as Error).message);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleQuickSolve = async (config: ExperimentConfig) => {
    setIsQuickSolving(true);
    try {
      const resp = await quickSolveExperiment(config);
      const completedExp = resp.experiment;
      completedExp.status = 'completed';
      completedExp.result = resp.result;

      setSelectedExperiment(completedExp);
      setExperiments((prev) => [completedExp, ...prev.filter((e) => e.id !== completedExp.id)]);
      setActiveTab('results');
    } catch (err) {
      console.error('Quick solve failed:', err);
      alert('Quick solve error: ' + (err as Error).message);
    } finally {
      setIsQuickSolving(false);
    }
  };

  const handleQuickRunDefault = () => {
    const config: ExperimentConfig = {
      name: `Heat1D-Baseline-${Date.now().toString().slice(-4)}`,
      equationId: 'heat_1d',
      parameters: { alpha: 0.1 },
      domain: { xMin: 0.0, xMax: 1.0, tMin: 0.0, tMax: 1.0 },
      network: {
        layers: [2, 32, 32, 1],
        activation: 'tanh',
        initialization: 'glorot_uniform',
      },
      training: {
        optimizer: 'adam',
        learningRate: 0.005,
        steps: 100,
        collocationPoints: 300,
        boundaryPoints: 48,
        initialPoints: 48,
        logInterval: 10,
        seed: 42,
        lossWeights: {
          lambda_r: 1.0,
          lambda_b: 20.0,
          lambda_0: 20.0,
        },
      },
      evaluation: {
        gridX: 25,
        gridT: 25,
      },
    };
    handleQuickSolve(config);
  };

  const handleStopExperiment = async () => {
    if (!selectedExperiment) return;
    setIsStopping(true);
    try {
      await stopExperiment(selectedExperiment.id);
      selectedExperiment.status = 'stopped';
      setSelectedExperiment({ ...selectedExperiment });
      reloadData();
    } catch (err) {
      console.error('Stop failed:', err);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090a] text-[#d0d6e0] flex flex-col">
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onNewExperiment={() => setActiveTab('studio')}
        systemStatus={health?.status ?? 'ONLINE'}
        juliaVersion={capabilities?.juliaVersion ?? '1.13.3'}
      />

      <main className="flex-1 px-4 lg:px-8 pb-12">
        {activeTab === 'overview' && (
          <OverviewView
            experiments={experiments}
            onSelectExperiment={handleSelectExperiment}
            onNavigateToStudio={() => setActiveTab('studio')}
            onNavigateToInverse={() => setActiveTab('inverse')}
            onQuickRunDefault={handleQuickRunDefault}
            isRunningQuick={isQuickSolving}
          />
        )}

        {activeTab === 'studio' && (
          <ExperimentStudioView
            initialEquation={selectedEquation}
            onLaunchExperiment={handleLaunchExperiment}
            onQuickSolve={handleQuickSolve}
            isLaunching={isLaunching}
            isQuickSolving={isQuickSolving}
          />
        )}

        {activeTab === 'equations' && (
          <EquationLibraryView
            onSelectEquationToConfigure={(eq) => {
              setSelectedEquation(eq);
              setActiveTab('studio');
            }}
          />
        )}

        {activeTab === 'training' && selectedExperiment && (
          <TrainingMonitorView
            experiment={selectedExperiment}
            metrics={liveMetrics.length > 0 ? liveMetrics : (selectedExperiment.result?.lossHistory ?? [])}
            elapsedTime={liveElapsedTime}
            onStop={handleStopExperiment}
            onViewResults={() => setActiveTab('results')}
            isStopping={isStopping}
          />
        )}

        {activeTab === 'results' && (
          <ResultsView
            experiment={selectedExperiment ?? experiments[0]}
            onNavigateToStudio={() => setActiveTab('studio')}
            onNavigateToReproduce={() => setActiveTab('reproduce')}
          />
        )}

        {activeTab === 'inverse' && (
          <InverseProblemsView />
        )}

        {activeTab === 'benchmarks' && (
          <BenchmarksView
            experiments={experiments}
            onSelectExperiment={handleSelectExperiment}
            onNavigateToStudio={() => setActiveTab('studio')}
          />
        )}

        {activeTab === 'reproduce' && (
          <ArtifactsView
            experiments={experiments}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            capabilities={capabilities}
            health={health}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#23252a] py-4 px-6 text-center text-xs font-mono text-[#62666d]">
        Axiom Scientific AI Laboratory · Powered by Julia 1.13 + Lux.jl + SciML ecosystem · Linear Precision Design
      </footer>
    </div>
  );
};
