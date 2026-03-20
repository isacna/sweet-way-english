import express from 'express';
import cors from 'cors';
import { router } from './http/routes/index.js';

async function startServer() {
  const app = express();
  const PORT = 3333;

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static('uploads'));
  app.use('/api', router);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
