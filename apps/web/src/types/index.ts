export interface EquationParameter {
  name: string;
  symbol: string;
  default: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  description: string;
}

export interface EquationTemplate {
  id: string;
  name: string;
  category: 'parabolic' | 'hyperbolic' | 'elliptic' | 'dynamical';
  pdeLatex: string;
  description: string;
  parameters: Record<string, EquationParameter>;
  domain: {
    x: [number, number];
    t: [number, number];
  };
  initialCondition: string;
  boundaryConditions: string[];
  analyticalAvailable: boolean;
  referenceSolver: string;
  defaultNetwork: {
    hiddenLayers: number;
    hiddenWidth: number;
    activation: 'tanh' | 'sigmoid' | 'sin' | 'gelu';
  };
  defaultTraining: {
    learningRate: number;
    steps: number;
    collocationPoints: number;
    boundaryPoints: number;
    initialPoints: number;
    lossWeights: {
      lambda_r: number;
      lambda_b: number;
      lambda_0: number;
    };
  };
}

export interface ExperimentConfig {
  id?: string;
  name: string;
  equationId: string;
  parameters: Record<string, number>;
  domain: {
    xMin: number;
    xMax: number;
    tMin: number;
    tMax: number;
  };
  network: {
    layers: number[];
    activation: 'tanh' | 'sigmoid' | 'sin' | 'gelu';
    initialization: 'glorot_uniform' | 'glorot_normal' | 'he_uniform';
  };
  training: {
    optimizer: 'adam' | 'lbfgs';
    learningRate: number;
    steps: number;
    collocationPoints: number;
    boundaryPoints: number;
    initialPoints: number;
    logInterval: number;
    seed: number;
    lossWeights: {
      lambda_r: number;
      lambda_b: number;
      lambda_0: number;
    };
  };
  evaluation: {
    gridX: number;
    gridT: number;
  };
}

export interface InverseExperimentConfig extends ExperimentConfig {
  inverse: {
    targetParameter: string;
    trueValue: number;
    initialGuess: number;
    sensorCount: number;
    noiseStd: number;
    learningRateParam: number;
  };
}

export interface TrainingMetricPoint {
  step: number;
  total: number;
  residual: number;
  boundary: number;
  initial: number;
  estimatedParam?: number;
  paramRelError?: number;
}

export interface ValidationCriterion {
  metric: string;
  threshold: number;
  actual: number;
  passed: boolean;
}

export interface EvaluationResult {
  experimentId: string;
  status: 'passed' | 'failed' | 'inconclusive' | 'not_evaluated';
  metrics: {
    mae: number;
    rmse: number;
    relativeL2: number;
    maxResidual: number;
    residualRms: number;
    icError: number;
    bcError: number;
    trainingLoss: number;
    validationLoss: number;
    optimizerSteps: number;
    trainingDurationSec: number;
    evalDurationSec: number;
    parametersCount: number;
  };
  grid: {
    x: number[];
    t: number[];
  };
  predicted: number[][]; // [t_idx][x_idx]
  reference: number[][]; // [t_idx][x_idx]
  absoluteError: number[][]; // [t_idx][x_idx]
  residualField: number[][]; // [t_idx][x_idx]
  timeSlices: {
    t: number;
    x: number[];
    predicted: number[];
    reference: number[];
    error: number[];
  }[];
  lossHistory: TrainingMetricPoint[];
  inverseHistory?: {
    step: number;
    estimate: number;
    relativeError: number;
  }[];
  validationCriteria: ValidationCriterion[];
  hardware: {
    backend: string;
    juliaVersion: string;
    threads: number;
    precision: string;
  };
}

export interface ExperimentRecord {
  id: string;
  name: string;
  equationId: string;
  type: 'forward' | 'inverse';
  status: 'draft' | 'running' | 'completed' | 'failed' | 'stopped';
  createdAt: string;
  completedAt?: string;
  config: ExperimentConfig | InverseExperimentConfig;
  result?: EvaluationResult;
}

export interface SystemCapabilities {
  engine: string;
  juliaVersion: string;
  cpuThreads: number;
  hardwareBackend: string;
  cudaAvailable: boolean;
  supportedEquations: string[];
  supportedOptimizers: string[];
  precisionModes: string[];
}
