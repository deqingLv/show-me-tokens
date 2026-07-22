import { Router } from 'express';
import { listAdapterNames } from '../../adapters/registry.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ agents: listAdapterNames() });
});

export default router;
