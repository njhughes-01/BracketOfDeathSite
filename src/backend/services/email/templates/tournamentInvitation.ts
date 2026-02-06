import { BrandingConfig } from "../IEmailProvider";

export interface InvitationEmailData {
  playerName: string;
  invitedByName?: string;
  tournament: {
    id: string;
    name: string;
    bodNumber: number;
    date: Date;
    location: string;
    format?: string;
    entryFee: number; // In cents
  };
  expiresAt: Date;
  customMessage?: string;
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
 * Format deadline in a friendly way
 */
function formatDeadline(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 1) {
    return `${days} days`;
  } else if (hours > 24) {
    return `1 day`;
  } else if (hours > 1) {
    return `${hours} hours`;
  } else {
    return "less than an hour";
  }
}

/**
 * Generate tournament invitation email
 * Sent when admin invites a player to a tournament
 */
export function generateTournamentInvitationEmail(data: InvitationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { playerName, invitedByName, tournament, expiresAt, customMessage, paymentLink, branding } = data;

  const formattedDate = tournament.date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedDeadline = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const timeRemaining = formatDeadline(expiresAt);

  // Custom message from admin (if provided)
  const customMessageHtml = customMessage
    ? `
      <div style="background-color:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-style:italic;color:#856404;">"${customMessage}"</p>
        ${invitedByName ? `<p style="margin:10px 0 0 0;font-size:12px;color:#856404;">— ${invitedByName}</p>` : ""}
      </div>`
    : "";

  const content = `
    <h2 style="margin:0 0 20px 0;color:#1a1a2e;">🎾 You're Invited!</h2>
    <p>Hello ${playerName}!</p>
    <p>You have been personally invited to compete in <strong>${tournament.name}</strong>!</p>
    
    ${customMessageHtml}
    
    <!-- Tournament Details -->
    <div style="background-color:#f0f0f0;border-radius:8px;padding:20px;margin:20px 0;">
      <h3 style="margin:0 0 15px 0;color:#1a1a2e;">Tournament Details</h3>
      <p style="margin:5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
      <p style="margin:5px 0;"><strong>📍 Location:</strong> ${tournament.location}</p>
      ${tournament.format ? `<p style="margin:5px 0;"><strong>🎯 Format:</strong> ${tournament.format}</p>` : ""}
      <p style="margin:5px 0;"><strong>💰 Entry Fee:</strong> ${formatAmount(tournament.entryFee)}</p>
    </div>
    
    <!-- Deadline Warning -->
    <div style="background-color:#fff3e0;border:1px solid #ff9800;border-radius:8px;padding:15px;margin:20px 0;text-align:center;">
      <p style="margin:0;font-weight:bold;color:#e65100;">⏰ Respond by ${formattedDeadline}</p>
      <p style="margin:5px 0 0 0;font-size:14px;color:#e65100;">You have ${timeRemaining} to accept</p>
    </div>
    
    <!-- CTA Button -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:25px auto;">
      <tr>
        <td style="background-color:${branding.brandPrimaryColor};border-radius:8px;">
          <a href="${paymentLink}" target="_blank" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:18px;">
            ${tournament.entryFee > 0 ? "🎫 Register & Pay Now" : "🎫 Confirm Registration"}
          </a>
        </td>
      </tr>
    </table>
    
    <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />
    
    <p style="font-size:14px;color:#666;">
      <strong>Note:</strong> This invitation will expire on ${formattedDeadline}. 
      After that, your spot may be offered to another player.
    </p>
    
    <p>We hope to see you there! 🏆</p>
  `;

  // Plain text version
  const text = `
You're Invited to ${tournament.name}!

Hello ${playerName}!

You have been personally invited to compete in ${tournament.name}!

${customMessage ? `Message from organizer: "${customMessage}"` : ""}

Tournament Details:
- Date: ${formattedDate}
- Location: ${tournament.location}
${tournament.format ? `- Format: ${tournament.format}` : ""}
- Entry Fee: ${formatAmount(tournament.entryFee)}

⏰ DEADLINE: Respond by ${formattedDeadline}
You have ${timeRemaining} to accept this invitation.

Register now: ${paymentLink}

Note: This invitation will expire on ${formattedDeadline}. After that, your spot may be offered to another player.

We hope to see you there!

---
${branding.brandName}
  `.trim();

  return {
    subject: `🎾 You're Invited: ${tournament.name}`,
    html: content,
    text,
  };
}

export default generateTournamentInvitationEmail;
