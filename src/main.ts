// main.ts
import './styles/reset.css';
import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/animations.css';

import { engine } from './core/Engine';
import { Renderer } from './ui/Renderer';
import { registerCareers, registerSerialContracts } from './systems/CareerSystem';
import { registerPoliticalPositions, registerPolicies, registerScandals } from './systems/PoliticalSystem';

import childhoodEvents from './content/events/childhood.json';
import politicalEvents from './content/events/political.json';
import serialContracts from './content/shadow/serial_contracts.json';
import positions from './content/politics/positions.json';
import policies from './content/politics/policies.json';
import scandals from './content/politics/scandals.json';

async function bootstrap() {
  // Load content
  engine.registry.registerMany(childhoodEvents as any);
  engine.registry.registerMany(politicalEvents as any);

  const careerModules = import.meta.glob('./content/careers/*.json', { eager: true, import: 'default' }) as Record<string, any>;
  const careers = Object.values(careerModules).flat();
  registerCareers(careers as any);
  registerSerialContracts(serialContracts as any);

  // Register political content
  registerPoliticalPositions(positions as any);
  registerPolicies(policies as any);
  registerScandals(scandals as any);

  // Start UI
  new Renderer('app');
}

// Ensure DOM is ready (Vite handles this usually, but safe to wrap)
document.addEventListener('DOMContentLoaded', bootstrap);
