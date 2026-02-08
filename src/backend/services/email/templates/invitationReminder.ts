import { BrandingConfig } from "../IEmailProvider";

export interface InvitationReminderEmailData {
  playerName: string;
  tournament: {
    id: string;
    name: string;
    bodNumber: number;
    date: Date;
    location: string;
    entryFee: number; // In cents
  };
  expiresAt: Date;
  hoursRemaining: number;
  paymentLink: string;
  branding: BrandingConfig;
}

/**
 * Format amount from cents to dollars
 */
function formatAmount(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Get urgency color based on hours remaining
 */
function getUrgencyColor(hours: number): string {
  if (hours <= 6) return "#dc3545"; // Red - critical
  if (hours <= 12) return "#fd7e14"; // Orange - urgent
  return "#ffc107"; // Yellow - warning
}

/**
 * Format time remaining in a human-friendly way
 */
function formatTimeRemaining(hours: number): string {
  if (hours < 1) {
    const minutes = Math.max(Math.floor(hours * 60), 1);
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  } else if (hours < 24) {
    const h = Math.floor(hours);
    return `${h} hour${h === 1 ? "" : "s"}`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    if (remainingHours > 0) {
      return `${days} day${days === 1 ? "" : "s"} and ${remainingHours} hour${remainingHours === 1 ? "" : "s"}`;
    }
    return `${days} day${days === 1 ? "" : "s"}`;
  }
}

/**
 * Generate invitation reminder email
 * Sent X hours before invitation expires
 */
export function generateInvitationReminderEmail(data: InvitationReminderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { playerName, tournament, expiresAt, hoursRemaining, paymentLink, branding } = data;

  const formattedDate = tournament.date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedExpiry = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const timeRemainingStr = formatTimeRemaining(hoursRemaining);
  const urgencyColor = getUrgencyColor(hoursRemaining);

  // Critical urgency indicator
  const isCritical = hoursRemaining <= 6;
  const urgencyEmoji = isCritical ? "🚨" : "⚠️";
  const urgencyText = isCritical ? "URGENT" : "REMINDER";

  const content = `
    <h2 style="margin:0 0 20px 0;color:${urgencyColor};">${urgencyEmoji} ${urgencyText}: Invitation Expiring Soon</h2>
    <p>Hello ${playerName}!</p>
    <p>Your invitation to <strong>${tournament.name}</strong> is about to expire!</p>
    
    <!-- Countdown Alert -->
    <div style="background-color:${urgencyColor}15;border:2px solid ${urgencyColor};border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0;font-size:14px;color:${urgencyColor};font-weight:bold;">TIME REMAINING</p>
      <p style="margin:10px 0;font-size:36px;font-weight:bold;color:${urgencyColor};">${timeRemainingStr}</p>
      <p style="margin:0;font-size:14px;color:#666;">Expires: ${formattedExpiry}</p>
    </div>
    
    <!-- Tournament Quick Details -->
    <div style="background-color:#f8f9fa;border-radius:8px;padding:15px;margin:20px 0;">
      <p style="margin:5px 0;"><strong>📅</strong> ${formattedDate}</p>
      <p style="margin:5px 0;"><strong>📍</strong> ${tournament.location}</p>
      <p style="margin:5px 0;"><strong>💰</strong> ${formatAmount(tournament.entryFee)}</p>
    </div>
    
    <!-- CTA Button (more urgent styling) -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:25px auto;">
      <tr>
        <td style="background-color:${urgencyColor};border-radius:8px;box-shadow:0 4px 15px ${urgencyColor}40;">
          <a href="${paymentLink}" target="_blank" style="display:inline-block;padding:18px 36px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:18px;">
            ${tournament.entryFee > 0 ? "🎫 Register Now Before It's Too Late!" : "🎫 Confirm Your Spot Now!"}
          </a>
        </td>
      </tr>
    </table>
    
    <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />
    
    <p style="font-size:14px;color:#666;">
      <strong>Don't miss out!</strong> Once this invitation expires, your spot will be offered to another player on the waitlist.
    </p>
    
    <p style="font-size:12px;color:#999;">
      If you're unable to attend, you can simply let this invitation expire. No action needed.
    </p>
  `;

  // Plain text version
  const text = `
${urgencyEmoji} ${urgencyText}: Your Invitation is Expiring!

Hello ${playerName}!

Your invitation to ${tournament.name} is about to expire!

⏰ TIME REMAINING: ${timeRemainingStr}
Expires: ${formattedExpiry}

Tournament Details:
- Date: ${formattedDate}
- Location: ${tournament.location}
- Entry Fee: ${formatAmount(tournament.entryFee)}

👉 Register now: ${paymentLink}

Don't miss out! Once this invitation expires, your spot will be offered to another player on the waitlist.

If you're unable to attend, you can simply let this invitation expire.

---
${branding.brandName}
  `.trim();

  // Subject line varies based on urgency
  const subjectPrefix = isCritical ? "🚨 FINAL REMINDER" : "⚠️ Reminder";
  
  return {
    subject: `${subjectPrefix}: ${timeRemainingStr} left - ${tournament.name}`,
    html: content,
    text,
  };
}

export default generateInvitationReminderEmail;
