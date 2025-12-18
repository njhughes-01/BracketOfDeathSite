import { Router } from 'express';
import playersRoutes from './players';
import tournamentsRoutes from './tournaments';
import tournamentResultsRoutes from './tournamentResults';
import dataRoutes from './data';
import adminRoutes from './admin';
import usersRoutes from './users';
import profileRoutes from './profile';

const router = Router();

// Mount all route modules
router.use('/players', playersRoutes);
router.use('/tournaments', tournamentsRoutes);
router.use('/tournament-results', tournamentResultsRoutes);
router.use('/data', dataRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/users', usersRoutes);
router.use('/profile', profileRoutes);

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Bracket of Death API',
    version: '1.0.0',
    endpoints: {
      players: '/api/players',
      tournaments: '/api/tournaments',
      tournamentResults: '/api/tournament-results',
      data: '/api/data',
      admin: '/api/admin',
      users: '/api/admin/users',
      profile: '/api/profile',
    },
    documentation: 'See CLAUDE.md for API documentation',
  });
});

export default router;