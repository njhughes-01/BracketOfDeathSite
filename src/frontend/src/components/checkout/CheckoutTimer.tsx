import React, { useState, useEffect, useCallback } from 'react';
import logger from '../../utils/logger';

interface CheckoutTimerProps {
  expiresAt: string; // ISO timestamp
  onExpire?: () => void;
}

/**
 * Countdown banner showing minutes:seconds until checkout expires.
 * - Warning style at < 5 min (yellow)
 * - Danger style at < 1 min (red)
 */
export const CheckoutTimer: React.FC<CheckoutTimerProps> = ({
  expiresAt,
  onExpire,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [hasExpired, setHasExpired] = useState(false);

  const calculateRemaining = useCallback((): number => {
    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((expiryTime - now) / 1000));
  }, [expiresAt]);

  useEffect(() => {
    // Initialize
    setRemainingSeconds(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);

      if (remaining <= 0 && !hasExpired) {
        setHasExpired(true);
        logger.info('Checkout timer expired');
        onExpire?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, calculateRemaining, hasExpired, onExpire]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine alert variant based on remaining time
  const getAlertClass = (): string => {
    if (remainingSeconds <= 60) {
      return 'alert-error'; // < 1 min - danger
    }
    if (remainingSeconds <= 300) {
      return 'alert-warning'; // < 5 min - warning
    }
    return 'alert-info'; // normal
  };

  const getIcon = (): string => {
    if (remainingSeconds <= 60) {
      return 'error';
    }
    if (remainingSeconds <= 300) {
      return 'warning';
    }
    return 'schedule';
  };

  if (hasExpired) {
    return (
      <div className="alert alert-error shadow-lg">
        <span className="material-symbols-outlined">error</span>
        <div>
          <h3 className="font-bold">Reservation Expired</h3>
          <div className="text-xs">Your spot has been released. Please start over.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`alert ${getAlertClass()} shadow-lg`}>
      <span className="material-symbols-outlined">{getIcon()}</span>
      <div>
        <h3 className="font-bold">Complete checkout in</h3>
        <div className="text-2xl font-mono font-bold">
          {formatTime(remainingSeconds)}
        </div>
      </div>
      {remainingSeconds <= 300 && (
        <div className="text-xs opacity-75">
          {remainingSeconds <= 60
            ? 'Hurry! Your spot will be released soon.'
            : 'Your spot is reserved until the timer runs out.'}
        </div>
      )}
    </div>
  );
};

export default CheckoutTimer;
