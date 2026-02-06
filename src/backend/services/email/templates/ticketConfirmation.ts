import { BrandingConfig } from "../IEmailProvider";

export interface TicketEmailData {
  playerName: string;
  ticketCode: string;
  qrCodeBase64?: string; // Base64 encoded PNG image
  tournament: {
    name: string;
    bodNumber: number;
    date: Date;
    location: string;
    format?: string;
  };
  amountPaid: number; // In cents
  branding: BrandingConfig;
}

/**
 * Generate Google Calendar URL for the tournament
 */
function generateCalendarLink(tournament: TicketEmailData["tournament"]): string {
  const startDate = new Date(tournament.date);
  // Format: YYYYMMDD (all-day event)
  const dateStr = startDate.toISOString().slice(0, 10).replace(/-/g, "");
  
  // End date is next day for all-day event
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);
  const endDateStr = endDate.toISOString().slice(0, 10).replace(/-/g, "");
  
  const title = encodeURIComponent(tournament.name);
  const location = encodeURIComponent(tournament.location);
  const details = encodeURIComponent(`Bracket of Death Tournament #${tournament.bodNumber}\nFormat: ${tournament.format || "Standard"}`);
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${endDateStr}&location=${location}&details=${details}`;
}

/**
 * Format amount from cents to dollars
 */
function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Generate ticket confirmation email
 * Sent after successful payment/registration
 */
export function generateTicketConfirmationEmail(data: TicketEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { playerName, ticketCode, qrCodeBase64, tournament, amountPaid, branding } = data;

  const formattedDate = tournament.date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const calendarLink = generateCalendarLink(tournament);

  // QR code image HTML (if available)
  const qrCodeHtml = qrCodeBase64
    ? `
      <div style="text-align:center;margin:20px 0;">
        <img src="data:image/png;base64,${qrCodeBase64}" alt="Ticket QR Code" style="width:150px;height:150px;" />
        <p style="margin:5px 0;font-size:12px;color:#666;">Scan at check-in</p>
      </div>`
    : "";

  const paymentInfo = amountPaid > 0
    ? `<p><strong>Amount Paid:</strong> $${formatAmount(amountPaid)}</p>`
    : `<p><strong>Entry:</strong> Free Registration</p>`;

  const content = `
    <h2 style="margin:0 0 20px 0;color:#1a1a2e;">🎾 Your Tournament Ticket</h2>
    <p>Hello ${playerName}!</p>
    <p>You're registered for <strong>${tournament.name}</strong>!</p>
    
    <!-- Ticket Code (prominent display) -->
    <div style="background-color:#f8f9fa;border:2px dashed ${branding.brandPrimaryColor};border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 8px 0;font-size:14px;color:#666;">YOUR TICKET CODE</p>
      <p style="margin:0;font-size:32px;font-weight:bold;color:${branding.brandPrimaryColor};letter-spacing:4px;">${ticketCode}</p>
    </div>
    
    ${qrCodeHtml}
    
    <!-- Tournament Details -->
    <div style="background-color:#f0f0f0;border-radius:8px;padding:20px;margin:20px 0;">
      <h3 style="margin:0 0 15px 0;color:#1a1a2e;">Tournament Details</h3>
      <p style="margin:5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
      <p style="margin:5px 0;"><strong>📍 Location:</strong> ${tournament.location}</p>
      ${tournament.format ? `<p style="margin:5px 0;"><strong>🎯 Format:</strong> ${tournament.format}</p>` : ""}
      ${paymentInfo}
    </div>
    
    <!-- Add to Calendar Button -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:15px 0;">
      <tr>
        <td style="background-color:${branding.brandSecondaryColor};border-radius:5px;">
          <a href="${calendarLink}" target="_blank" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;">
            📅 Add to Calendar
          </a>
        </td>
      </tr>
    </table>
    
    <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />
    
    <p style="font-size:14px;color:#666;">
      <strong>Important:</strong> Please bring this email or your ticket code to the event for check-in.
    </p>
    
    <p>See you on the court! 🏆</p>
  `;

  // Plain text version
  const text = `
Your Tournament Ticket - ${tournament.name}

Hello ${playerName}!

You're registered for ${tournament.name}!

TICKET CODE: ${ticketCode}

Tournament Details:
- Date: ${formattedDate}
- Location: ${tournament.location}
${tournament.format ? `- Format: ${tournament.format}` : ""}
${amountPaid > 0 ? `- Amount Paid: $${formatAmount(amountPaid)}` : "- Entry: Free Registration"}

Add to Calendar: ${calendarLink}

Important: Please bring this email or your ticket code to the event for check-in.

See you on the court!

---
${branding.brandName}
  `.trim();

  return {
    subject: `🎾 Your Ticket: ${tournament.name} - ${ticketCode}`,
    html: content,
    text,
  };
}

export default generateTicketConfirmationEmail;
