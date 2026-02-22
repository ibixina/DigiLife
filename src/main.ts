// main.ts
import './styles/reset.css';
import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/animations.css';

import { engine } from './core/Engine';
import { Renderer } from './ui/Renderer';

import childhoodEvents from './content/events/childhood.json';

async function bootstrap() {
  // Load content
  engine.registry.registerMany(childhoodEvents as any);

  // Start UI
  new Renderer('app');
}

// Ensure DOM is ready (Vite handles this usually, but safe to wrap)
document.addEventListener('DOMContentLoaded', bootstrap);
