import { describe, it, expect } from 'vitest';
import { EQUATION_TEMPLATES } from '../src/lib/equations';

describe('Axiom Scientific AI Frontend Suite', () => {
  it('loads all 4 primary governing differential equations', () => {
    const keys = Object.keys(EQUATION_TEMPLATES);
    expect(keys).toContain('heat_1d');
    expect(keys).toContain('burgers_1d');
    expect(keys).toContain('wave_1d');
    expect(keys).toContain('harmonic_oscillator');
  });

  it('verifies 1D Heat Equation parameters and domain constraints', () => {
    const heat = EQUATION_TEMPLATES['heat_1d'];
    expect(heat.parameters.alpha).toBeDefined();
    expect(heat.parameters.alpha.default).toBe(0.1);
    expect(heat.domain.x).toEqual([0.0, 1.0]);
    expect(heat.domain.t).toEqual([0.0, 1.0]);
    expect(heat.analyticalAvailable).toBe(true);
  });

  it('verifies 1D Burgers Equation viscous diffusivity parameter', () => {
    const burgers = EQUATION_TEMPLATES['burgers_1d'];
    expect(burgers.parameters.nu).toBeDefined();
    expect(burgers.category).toBe('hyperbolic');
    expect(burgers.domain.x).toEqual([-1.0, 1.0]);
  });

  it('verifies default neural network hyperparameters', () => {
    const heat = EQUATION_TEMPLATES['heat_1d'];
    expect(heat.defaultNetwork.hiddenLayers).toBe(4);
    expect(heat.defaultNetwork.hiddenWidth).toBe(64);
    expect(heat.defaultNetwork.activation).toBe('tanh');
    expect(heat.defaultTraining.learningRate).toBe(0.001);
  });
});
