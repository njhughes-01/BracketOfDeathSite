import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TournamentCreate: React.FC = () => {
  const navigate = useNavigate();

  // Redirect to the new tournament setup wizard
  useEffect(() => {
    navigate('/tournaments/setup', { replace: true });
  }, [navigate]);

  return null;
};

export default TournamentCreate;