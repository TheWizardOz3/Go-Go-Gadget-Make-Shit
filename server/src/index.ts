import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import statusRouter from './api/status.js';
import { errorHandler } from './middleware/errorHandler.js';
import { config } from './lib/config.js';

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/status', statusRouter);

// Error handling (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GoGoGadgetClaude server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/status`);
});
