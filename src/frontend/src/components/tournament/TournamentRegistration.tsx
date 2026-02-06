import React from "react";
import { Link } from "react-router-dom";
import { CheckoutTimer, DiscountCodeInput } from "../checkout";
import type { DiscountInfo } from "../checkout";
import type { Tournament } from "../../types/api";

// Registration state machine
export type RegistrationState =
  | "loading"
  | "not_logged_in"
  | "not_registered"
  | "reserved"
  | "registered"
  | "waitlisted"
  | "invite_only"
  | "closed"
  | "full";

export interface ReservationInfo {
  reservationId: string;
  expiresAt: string;
  remainingSeconds: number;
}

export interface UserTicket {
  _id: string;
  ticketCode: string;
  status: "valid" | "checked_in" | "refunded" | "void";
  paymentStatus: "paid" | "free" | "refunded";
  amountPaid: number;
}

interface TournamentRegistrationProps {
  tournament: Tournament;
  tournamentId: string;
  registrationState: RegistrationState;
  reservation: ReservationInfo | null;
  userTicket: UserTicket | null;
  currentPrice: number;
  finalPrice: number;
  requiresPayment: boolean;
  discountInfo: DiscountInfo | null;
  checkoutLoading: boolean;
  checkoutError: string | null;
  onReserveSlot: () => void;
  onCompleteCheckout: () => void;
  onCancelReservation: () => void;
  onReservationExpire: () => void;
  onDiscountApply: (code: string, info: DiscountInfo) => void;
  onClearError: () => void;
}

// Format price in dollars
const formatPrice = (cents: number): string => {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
};

const TournamentRegistration: React.FC<TournamentRegistrationProps> = ({
  tournament,
  tournamentId,
  registrationState,
  reservation,
  userTicket,
  currentPrice,
  finalPrice,
  requiresPayment,
  discountInfo,
  checkoutLoading,
  checkoutError,
  onReserveSlot,
  onCompleteCheckout,
  onCancelReservation,
  onReservationExpire,
  onDiscountApply,
  onClearError,
}) => {
  return (
    <div className="bg-[#1c2230] rounded-2xl p-6 border border-white/5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary">
          how_to_reg
        </span>
        <h3 className="text-white font-bold text-lg">Registration</h3>
      </div>

      {/* Checkout Timer Banner */}
      {registrationState === "reserved" && reservation && (
        <div className="mb-4">
          <CheckoutTimer
            expiresAt={reservation.expiresAt}
            onExpire={onReservationExpire}
          />
        </div>
      )}

      {/* Error Alert */}
      {checkoutError && (
        <div className="alert alert-error mb-4">
          <span className="material-symbols-outlined">error</span>
          <span>{checkoutError}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClearError}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Price Display */}
      {requiresPayment && (
        <div className="mb-4 p-4 bg-background-dark rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Entry Fee</span>
            <div className="text-right">
              {tournament?.earlyBirdFee && tournament?.earlyBirdDeadline && (
                <>
                  {new Date() < new Date(tournament.earlyBirdDeadline) ? (
                    <div>
                      <span className="text-green-400 font-bold text-lg">
                        {formatPrice(tournament.earlyBirdFee)}
                      </span>
                      <span className="text-slate-500 line-through ml-2 text-sm">
                        {formatPrice(tournament.entryFee || 0)}
                      </span>
                      <p className="text-[10px] text-green-400/70">
                        Early bird ends {new Date(tournament.earlyBirdDeadline).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <span className="text-white font-bold text-lg">
                      {formatPrice(tournament?.entryFee || 0)}
                    </span>
                  )}
                </>
              )}
              {!tournament?.earlyBirdFee && (
                <span className="text-white font-bold text-lg">
                  {formatPrice(tournament?.entryFee || 0)}
                </span>
              )}
            </div>
          </div>

          {/* Discount applied */}
          {discountInfo?.valid && (
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-slate-400 text-sm">After Discount</span>
              <span className="text-primary font-bold text-lg">
                {formatPrice(finalPrice)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Registration States */}
      {registrationState === "loading" && (
        <div className="flex items-center justify-center py-8">
          <div className="loading loading-spinner loading-lg text-primary" />
        </div>
      )}

      {registrationState === "not_logged_in" && (
        <div className="text-center py-6">
          <p className="text-slate-400 mb-4">
            Sign in to register for this tournament
          </p>
          <Link
            to="/login"
            className="btn btn-primary"
          >
            <span className="material-symbols-outlined mr-2">login</span>
            Sign In
          </Link>
        </div>
      )}

      {registrationState === "registered" && userTicket && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-400 mb-4">
            <span className="material-symbols-outlined">check_circle</span>
            <span className="font-bold">You're Registered!</span>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Ticket Code: <span className="font-mono text-white">{userTicket.ticketCode}</span>
          </p>
          <Link
            to={`/tickets/${userTicket._id}`}
            className="btn btn-outline btn-primary"
          >
            <span className="material-symbols-outlined mr-2">confirmation_number</span>
            View Ticket
          </Link>
        </div>
      )}

      {registrationState === "waitlisted" && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-400 mb-4">
            <span className="material-symbols-outlined">hourglass_empty</span>
            <span className="font-bold">On Waitlist</span>
          </div>
          <p className="text-slate-400 text-sm">
            You'll be notified if a spot opens up.
          </p>
        </div>
      )}

      {registrationState === "invite_only" && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 text-purple-400 mb-4">
            <span className="material-symbols-outlined">lock</span>
            <span className="font-bold">Invite Only</span>
          </div>
          <p className="text-slate-400 text-sm">
            This tournament is by invitation only.
          </p>
        </div>
      )}

      {registrationState === "closed" && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-500/20 text-slate-400 mb-4">
            <span className="material-symbols-outlined">event_busy</span>
            <span className="font-bold">Registration Closed</span>
          </div>
        </div>
      )}

      {registrationState === "full" && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 text-red-400 mb-4">
            <span className="material-symbols-outlined">group_off</span>
            <span className="font-bold">Tournament Full</span>
          </div>
          <p className="text-slate-400 text-sm">
            All spots have been filled.
          </p>
        </div>
      )}

      {registrationState === "not_registered" && (
        <div className="space-y-4">
          {/* Discount Code Input - only for paid tournaments */}
          {requiresPayment && (
            <DiscountCodeInput
              tournamentId={tournamentId}
              onApply={onDiscountApply}
              disabled={checkoutLoading}
            />
          )}

          {/* Register Button */}
          <button
            className={`btn btn-primary w-full ${checkoutLoading ? "loading" : ""}`}
            onClick={onReserveSlot}
            disabled={checkoutLoading}
          >
            {!checkoutLoading && (
              <span className="material-symbols-outlined mr-2">
                how_to_reg
              </span>
            )}
            {requiresPayment
              ? `Register — ${formatPrice(finalPrice)}`
              : "Register (Free)"}
          </button>
        </div>
      )}

      {registrationState === "reserved" && reservation && (
        <div className="space-y-4">
          {/* Discount Code Input - only for paid tournaments, before completing checkout */}
          {requiresPayment && finalPrice > 0 && (
            <DiscountCodeInput
              tournamentId={tournamentId}
              onApply={onDiscountApply}
              disabled={checkoutLoading}
            />
          )}

          {/* Complete Checkout Button */}
          <button
            className={`btn btn-primary w-full ${checkoutLoading ? "loading" : ""}`}
            onClick={onCompleteCheckout}
            disabled={checkoutLoading}
          >
            {!checkoutLoading && (
              <span className="material-symbols-outlined mr-2">
                {requiresPayment && finalPrice > 0 ? "credit_card" : "check_circle"}
              </span>
            )}
            {requiresPayment && finalPrice > 0
              ? `Complete Payment — ${formatPrice(finalPrice)}`
              : "Complete Registration"}
          </button>

          {/* Cancel Reservation */}
          <button
            className="btn btn-ghost btn-sm w-full"
            onClick={onCancelReservation}
            disabled={checkoutLoading}
          >
            Cancel Reservation
          </button>
        </div>
      )}

      {/* Spots Remaining */}
      {tournament?.maxPlayers && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Spots Remaining</span>
            <span className={`font-bold ${
              (tournament.maxPlayers - (tournament.currentPlayerCount || 0)) <= 5
                ? "text-yellow-400"
                : "text-white"
            }`}>
              {tournament.maxPlayers - (tournament.currentPlayerCount || 0)} / {tournament.maxPlayers}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{
                width: `${((tournament.currentPlayerCount || 0) / tournament.maxPlayers) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentRegistration;
