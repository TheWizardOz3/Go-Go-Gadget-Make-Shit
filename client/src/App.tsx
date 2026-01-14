import { cn } from '@/lib/cn';

export default function App() {
  return (
    <div
      className={cn(
        'dark',
        'min-h-screen',
        'flex',
        'flex-col',
        'items-center',
        'justify-center',
        'bg-background',
        'p-4'
      )}
    >
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-accent-dark to-accent-light text-center">
        GoGoGadgetClaude
      </h1>
      <p className="text-base sm:text-lg text-text-secondary mt-4 text-center">
        Mobile control for Claude Code
      </p>
      <div className="mt-8 px-6 py-3 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent">
        ✓ React + Vite + Tailwind configured
      </div>
    </div>
  );
}
