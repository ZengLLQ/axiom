import React, { useState } from 'react';
import { ExperimentConfig, EquationTemplate } from '../../types';
import { EQUATION_TEMPLATES } from '../../lib/equations';
import { FlaskConical, Play, Zap } from 'lucide-react';

interface ExperimentStudioProps {
  initialEquation?: EquationTemplate;
  onLaunchExperiment: (config: ExperimentConfig) => void;
  onQuickSolve: (config: ExperimentConfig) => void;
  isLaunching: boolean;
  isQuickSolving: boolean;
}

export const ExperimentStudioView: React.FC<ExperimentStudioProps> = ({
  initialEquation,
  onLaunchExperiment,
  onQuickSolve,
  isLaunching,
  isQuickSolving,
}) => {
  const [equationId, setEquationId] = useState<string>(initialEquation?.id ?? 'heat_1d');
  const currentEq = EQUATION_TEMPLATES[equationId] ?? EQUATION_TEMPLATES['heat_1d'];

  // Form State
  const [name, setName] = useState<string>(`PINN-${currentEq.name.slice(0, 8)}-${Date.now().toString().slice(-4)}`);
  const [alpha, setAlpha] = useState<number>(currentEq.parameters.alpha?.default ?? 0.1);
  const [xMin, setXMin] = useState<number>(currentEq.domain.x[0]);
  const [xMax, setXMax] = useState<number>(currentEq.domain.x[1]);
  const [tMin, setTMin] = useState<number>(currentEq.domain.t[0]);
  const [tMax, setTMax] = useState<number>(currentEq.domain.t[1]);

  // Network State
  const [hiddenLayers, setHiddenLayers] = useState<number>(3);
  const [hiddenWidth, setHiddenWidth] = useState<number>(32);
  const [activation, setActivation] = useState<'tanh' | 'sigmoid' | 'sin' | 'gelu'>('tanh');

  // Training State
  const [learningRate, setLearningRate] = useState<number>(0.005);
  const [steps, setSteps] = useState<number>(200);
  const [collocationPoints, setCollocationPoints] = useState<number>(400);
  const [boundaryPoints, setBoundaryPoints] = useState<number>(64);
  const [initialPoints, setInitialPoints] = useState<number>(64);
  const [lambdaR, setLambdaR] = useState<number>(1.0);
  const [lambdaB, setLambdaB] = useState<number>(20.0);
  const [lambda0, setLambda0] = useState<number>(20.0);
  const [seed, setSeed] = useState<number>(42);

  // Evaluation Grid
  const [gridX, setGridX] = useState<number>(25);
  const [gridT, setGridT] = useState<number>(25);

  // Parameter calculation preview
  const inputDim = 2; // (x, t)
  const outputDim = 1; // u
  let totalParams = (inputDim * hiddenWidth + hiddenWidth);
  for (let l = 1; l < hiddenLayers; l++) {
    totalParams += (hiddenWidth * hiddenWidth + hiddenWidth);
  }
  totalParams += (hiddenWidth * outputDim + outputDim);

  const buildConfig = (): ExperimentConfig => {
    const layers = [inputDim];
    for (let l = 0; l < hiddenLayers; l++) layers.push(hiddenWidth);
    layers.push(outputDim);

    return {
      name,
      equationId,
      parameters: { alpha },
      domain: { xMin, xMax, tMin, tMax },
      network: {
        layers,
        activation,
        initialization: 'glorot_uniform',
      },
      training: {
        optimizer: 'adam',
        learningRate,
        steps,
        collocationPoints,
        boundaryPoints,
        initialPoints,
        logInterval: Math.max(5, Math.round(steps / 20)),
        seed,
        lossWeights: {
          lambda_r: lambdaR,
          lambda_b: lambdaB,
          lambda_0: lambda0,
        },
      },
      evaluation: {
        gridX,
        gridT,
      },
    };
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#23252a] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-4 h-4 text-[#e4f222]" />
            <span className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider">
              Experiment Workbench
            </span>
          </div>
          <h1 className="text-2xl font-[510] text-[#ffffff] tracking-[-0.022em]">
            PINN Architecture & Physics Studio
          </h1>
          <p className="text-xs text-[#8a8f98] mt-1 max-w-[650px]">
            Configure neural hyperparameters, spatial-temporal collocation grids, and loss weighting for the Physics-Informed Neural Network.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onQuickSolve(buildConfig())}
            disabled={isQuickSolving || isLaunching}
            className="btn-ghost"
          >
            <Zap className="w-3.5 h-3.5 text-[#02b8cc]" />
            <span>{isQuickSolving ? 'Solving...' : 'Quick Solve'}</span>
          </button>

          <button
            onClick={() => onLaunchExperiment(buildConfig())}
            disabled={isLaunching || isQuickSolving}
            className="btn-primary-action"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isLaunching ? 'Initializing...' : 'Launch Experiment'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Problem Definition & Architecture */}
        <div className="lg:col-span-6 space-y-6">
          {/* Section 1: Problem Selection */}
          <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] space-y-4">
            <div className="flex items-center justify-between border-b border-[#23252a] pb-3">
              <h3 className="text-sm font-medium text-[#ffffff]">1. Governing Problem</h3>
              <span className="text-[11px] font-mono text-[#8a8f98]">{currentEq.pdeLatex}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#8a8f98] font-mono block mb-1.5">Experiment Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="linear-input w-full font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-[#8a8f98] font-mono block mb-1.5">Governing PDE</label>
                <select
                  value={equationId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setEquationId(id);
                    const eq = EQUATION_TEMPLATES[id];
                    if (eq?.parameters.alpha) setAlpha(eq.parameters.alpha.default);
                  }}
                  className="linear-input w-full font-mono text-xs bg-[#0f1011]"
                >
                  {Object.values(EQUATION_TEMPLATES).map((eq) => (
                    <option key={eq.id} value={eq.id} className="bg-[#161718] text-[#d0d6e0]">
                      {eq.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Physical Parameter */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-[#8a8f98]">Thermal Diffusivity (α)</span>
                <span className="text-[#e4f222]">{alpha} m²/s</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full accent-[#e4f222] bg-[#23252a] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Domain Bounds */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
              <div>
                <span className="text-[#62666d] block mb-1">x Min</span>
                <input
                  type="number"
                  value={xMin}
                  onChange={(e) => setXMin(parseFloat(e.target.value))}
                  className="linear-input w-full text-xs p-1.5"
                />
              </div>
              <div>
                <span className="text-[#62666d] block mb-1">x Max</span>
                <input
                  type="number"
                  value={xMax}
                  onChange={(e) => setXMax(parseFloat(e.target.value))}
                  className="linear-input w-full text-xs p-1.5"
                />
              </div>
              <div>
                <span className="text-[#62666d] block mb-1">t Min</span>
                <input
                  type="number"
                  value={tMin}
                  onChange={(e) => setTMin(parseFloat(e.target.value))}
                  className="linear-input w-full text-xs p-1.5"
                />
              </div>
              <div>
                <span className="text-[#62666d] block mb-1">t Max</span>
                <input
                  type="number"
                  value={tMax}
                  onChange={(e) => setTMax(parseFloat(e.target.value))}
                  className="linear-input w-full text-xs p-1.5"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Neural Network Architecture */}
          <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] space-y-4">
            <div className="flex items-center justify-between border-b border-[#23252a] pb-3">
              <h3 className="text-sm font-medium text-[#ffffff]">2. Neural Network (Lux.jl)</h3>
              <span className="text-xs font-mono text-[#e4f222] bg-[rgba(228,242,34,0.1)] px-2 py-0.5 rounded-[4px]">
                {totalParams} Parameters
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-[#8a8f98] font-mono block mb-1.5">Hidden Layers</label>
                <select
                  value={hiddenLayers}
                  onChange={(e) => setHiddenLayers(parseInt(e.target.value))}
                  className="linear-input w-full font-mono text-xs bg-[#0f1011]"
                >
                  <option value={2}>2 Layers</option>
                  <option value={3}>3 Layers</option>
                  <option value={4}>4 Layers</option>
                  <option value={5}>5 Layers</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#8a8f98] font-mono block mb-1.5">Layer Width</label>
                <select
                  value={hiddenWidth}
                  onChange={(e) => setHiddenWidth(parseInt(e.target.value))}
                  className="linear-input w-full font-mono text-xs bg-[#0f1011]"
                >
                  <option value={16}>16 Neurons</option>
                  <option value={32}>32 Neurons</option>
                  <option value={64}>64 Neurons</option>
                  <option value={128}>128 Neurons</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#8a8f98] font-mono block mb-1.5">Activation</label>
                <select
                  value={activation}
                  onChange={(e) => setActivation(e.target.value as any)}
                  className="linear-input w-full font-mono text-xs bg-[#0f1011]"
                >
                  <option value="tanh">tanh (Smooth)</option>
                  <option value="sin">sin (Harmonic)</option>
                  <option value="gelu">gelu (Smooth ReLU)</option>
                  <option value="sigmoid">sigmoid</option>
                </select>
              </div>
            </div>

            {/* Architecture Visualization Pill Strip */}
            <div className="bg-[#161718] p-3 rounded-[6px] border border-[#23252a] flex items-center justify-between text-xs font-mono">
              <span className="text-[#8a8f98]">Topology:</span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-[4px] bg-[#08090a] border border-[#23252a] text-[#02b8cc]">
                  In: 2 [x,t]
                </span>
                <span className="text-[#62666d]">→</span>
                {Array.from({ length: hiddenLayers }).map((_, i) => (
                  <React.Fragment key={i}>
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#08090a] border border-[#23252a] text-[#ffffff]">
                      {hiddenWidth}
                    </span>
                    <span className="text-[#62666d]">→</span>
                  </React.Fragment>
                ))}
                <span className="px-2 py-0.5 rounded-[4px] bg-[#08090a] border border-[#23252a] text-[#e4f222]">
                  Out: 1 [u]
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Training Hyperparameters & Collocation Grid */}
        <div className="lg:col-span-6 space-y-6">
          {/* Section 3: Training & Collocation */}
          <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] space-y-4">
            <div className="flex items-center justify-between border-b border-[#23252a] pb-3">
              <h3 className="text-sm font-medium text-[#ffffff]">3. Optimization & Sampling</h3>
              <span className="text-[11px] font-mono text-[#8a8f98]">Adam + Zygote</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-[#8a8f98] font-mono block mb-1.5">Optimizer Steps</label>
                <input
                  type="number"
                  min="20"
                  max="5000"
                  step="20"
                  value={steps}
                  onChange={(e) => setSteps(parseInt(e.target.value))}
                  className="linear-input w-full font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-[#8a8f98] font-mono block mb-1.5">Learning Rate</label>
                <input
                  type="number"
                  min="0.0001"
                  max="0.05"
                  step="0.001"
                  value={learningRate}
                  onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                  className="linear-input w-full font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-[#8a8f98] font-mono block mb-1.5">Random Seed</label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value))}
                  className="linear-input w-full font-mono text-xs"
                />
              </div>
            </div>

            {/* Collocation points counts */}
            <div className="grid grid-cols-3 gap-4 pt-1">
              <div>
                <label className="text-[11px] text-[#8a8f98] font-mono block mb-1">Collocation (Nr)</label>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  step="50"
                  value={collocationPoints}
                  onChange={(e) => setCollocationPoints(parseInt(e.target.value))}
                  className="linear-input w-full font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#8a8f98] font-mono block mb-1">Boundary (Nb)</label>
                <input
                  type="number"
                  min="16"
                  max="1000"
                  step="16"
                  value={boundaryPoints}
                  onChange={(e) => setBoundaryPoints(parseInt(e.target.value))}
                  className="linear-input w-full font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#8a8f98] font-mono block mb-1">Initial (N0)</label>
                <input
                  type="number"
                  min="16"
                  max="1000"
                  step="16"
                  value={initialPoints}
                  onChange={(e) => setInitialPoints(parseInt(e.target.value))}
                  className="linear-input w-full font-mono text-xs"
                />
              </div>
            </div>

            {/* Loss Weights */}
            <div className="pt-2">
              <label className="text-xs text-[#8a8f98] font-mono block mb-2">
                Loss Objective Weights: L = λr Lr + λb Lb + λ0 L0
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#161718] p-2.5 rounded-[6px] border border-[#23252a]">
                  <span className="text-[10px] text-[#8a8f98] font-mono block">Residual (λr)</span>
                  <input
                    type="number"
                    step="0.5"
                    value={lambdaR}
                    onChange={(e) => setLambdaR(parseFloat(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono text-[#ffffff] focus:outline-none"
                  />
                </div>
                <div className="bg-[#161718] p-2.5 rounded-[6px] border border-[#23252a]">
                  <span className="text-[10px] text-[#8a8f98] font-mono block">Boundary (λb)</span>
                  <input
                    type="number"
                    step="1"
                    value={lambdaB}
                    onChange={(e) => setLambdaB(parseFloat(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono text-[#ffffff] focus:outline-none"
                  />
                </div>
                <div className="bg-[#161718] p-2.5 rounded-[6px] border border-[#23252a]">
                  <span className="text-[10px] text-[#8a8f98] font-mono block">Initial (λ0)</span>
                  <input
                    type="number"
                    step="1"
                    value={lambda0}
                    onChange={(e) => setLambda0(parseFloat(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono text-[#ffffff] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Scientific Evaluation Resolution */}
          <div className="bg-[#0f1011] rounded-[12px] p-5 shadow-[inset_0_0_0_1px_#23252a] space-y-4">
            <div className="flex items-center justify-between border-b border-[#23252a] pb-3">
              <h3 className="text-sm font-medium text-[#ffffff]">4. Evaluation Grid</h3>
              <span className="text-xs font-mono text-[#02b8cc]">{gridX * gridT} Points</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#8a8f98] font-mono block mb-1">Spatial Grid (Nx)</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  step="5"
                  value={gridX}
                  onChange={(e) => setGridX(parseInt(e.target.value))}
                  className="linear-input w-full font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-[#8a8f98] font-mono block mb-1">Temporal Grid (Nt)</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  step="5"
                  value={gridT}
                  onChange={(e) => setGridT(parseInt(e.target.value))}
                  className="linear-input w-full font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
