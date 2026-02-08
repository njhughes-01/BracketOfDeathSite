import React, { useState } from 'react';
import logger from '../../utils/logger';
import api from '../../services/api';

export interface DiscountInfo {
  valid: boolean;
  discountType?: 'percent' | 'amount';
  discountValue?: number; // Percentage (0-100) or amount in cents
  error?: 'expired' | 'limit_reached' | 'not_applicable' | string;
}

interface DiscountCodeInputProps {
  tournamentId: string;
  onApply: (code: string, discountInfo: DiscountInfo) => void;
  disabled?: boolean;
}

interface ValidationResponse {
  valid: boolean;
  discountType?: 'percent' | 'amount';
  discountValue?: number;
  error?: string;
}

/**
 * Text input with "Apply" button for discount code validation.
 * Validates code via POST /api/discount-codes/validate
 * Shows discount amount on success, error message on failure.
 */
export const DiscountCodeInput: React.FC<DiscountCodeInputProps> = ({
  tournamentId,
  onApply,
  disabled = false,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountInfo | null>(null);

  const handleApply = async () => {
    const trimmedCode = code.trim().toUpperCase();
    
    if (!trimmedCode) {
      setError('Please enter a discount code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<ValidationResponse>('/discount-codes/validate', {
        code: trimmedCode,
        tournamentId,
      });

      const result: DiscountInfo = {
        valid: response.data.valid,
        discountType: response.data.discountType,
        discountValue: response.data.discountValue,
        error: response.data.error,
      };

      if (result.valid) {
        setAppliedDiscount(result);
        setError(null);
        logger.info('Discount code applied', { code: trimmedCode, result });
        onApply(trimmedCode, result);
      } else {
        setError(getErrorMessage(result.error));
        setAppliedDiscount(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to validate code';
      setError(message);
      setAppliedDiscount(null);
      logger.error('Discount code validation failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCode('');
    setAppliedDiscount(null);
    setError(null);
    onApply('', { valid: false });
  };

  const getErrorMessage = (errorCode?: string): string => {
    switch (errorCode) {
      case 'expired':
        return 'This discount code has expired';
      case 'limit_reached':
        return 'This discount code has reached its usage limit';
      case 'not_applicable':
        return 'This code cannot be used for this tournament';
      default:
        return errorCode || 'Invalid discount code';
    }
  };

  const formatDiscount = (discount: DiscountInfo): string => {
    if (!discount.discountValue) return '';
    
    if (discount.discountType === 'percent') {
      return `${discount.discountValue}% off`;
    }
    
    // Amount is in cents, format as currency
    const amount = (discount.discountValue / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    return `${amount} off`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && !disabled && !appliedDiscount) {
      e.preventDefault();
      handleApply();
    }
  };

  // Show applied discount state
  if (appliedDiscount) {
    return (
      <div className="form-control">
        <label className="label">
          <span className="label-text">Discount Code</span>
        </label>
        <div className="alert alert-success py-3">
          <span className="material-symbols-outlined">check_circle</span>
          <div className="flex-1">
            <span className="font-mono font-bold">{code}</span>
            <span className="ml-2 text-sm">— {formatDiscount(appliedDiscount)}</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleRemove}
            aria-label="Remove discount code"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text">Discount Code</span>
        <span className="label-text-alt">(optional)</span>
      </label>
      
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter code"
          className={`input input-bordered flex-1 uppercase ${error ? 'input-error' : ''}`}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          maxLength={20}
          aria-describedby={error ? 'discount-error' : undefined}
        />
        <button
          type="button"
          className={`btn btn-primary ${loading ? 'loading' : ''}`}
          onClick={handleApply}
          disabled={disabled || loading || !code.trim()}
        >
          {!loading && 'Apply'}
        </button>
      </div>

      {error && (
        <label className="label" id="discount-error">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
};

export default DiscountCodeInput;
