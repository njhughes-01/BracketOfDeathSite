import { BrandingConfig } from "../IEmailProvider";

export interface RefundEmailData {
  playerName: string;
  ticketCode: string;
  tournament: {
    name: string;
    bodNumber: number;
    date: Date;
    location: string;
  };
  refundAmount: number; // In cents
  originalAmount: number; // In cents
  refundReason?: string;
  branding: BrandingConfig;
}

/**
 * Format amount from cents to dollars
 */
function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Generate refund confirmation email
 * Sent when a ticket is refunded
 */
export function generateRefundConfirmationEmail(data: RefundEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { playerName, ticketCode, tournament, refundAmount, originalAmount, refundReason, branding } = data;

  const formattedDate = tournament.date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Partial refund check
  const isPartialRefund = refundAmount < originalAmount;
  const refundNote = isPartialRefund
    ? `<p style="font-size:14px;color:#666;margin-top:10px;">
        <strong>Note:</strong> This is a partial refund. Original payment was ${formatAmount(originalAmount)}.
       </p>`
    : "";

  // Refund reason (if provided)
  const reasonHtml = refundReason
    ? `<p style="margin:10px 0;"><strong>Reason:</strong> ${refundReason}</p>`
    : "";

  const content = `
    <h2 style="margin:0 0 20px 0;color:#1a1a2e;">💳 Refund Confirmed</h2>
    <p>Hello ${playerName}!</p>
    <p>We've processed your refund for <strong>${tournament.name}</strong>.</p>
    
    <!-- Refund Amount -->
    <div style="background-color:#d4edda;border:1px solid #c3e6cb;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0;font-size:14px;color:#155724;">REFUND AMOUNT</p>
      <p style="margin:10px 0 5px 0;font-size:32px;font-weight:bold;color:#155724;">${formatAmount(refundAmount)}</p>
      <p style="margin:0;font-size:12px;color:#155724;">will be credited to your original payment method</p>
    </div>
    
    ${refundNote}
    
    <!-- Ticket Details -->
    <div style="background-color:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;">
      <h3 style="margin:0 0 15px 0;color:#1a1a2e;">Original Ticket Details</h3>
      <p style="margin:5px 0;"><strong>Ticket Code:</strong> <span style="text-decoration:line-through;color:#999;">${ticketCode}</span> <span style="color:#dc3545;font-weight:bold;">(VOID)</span></p>
      <p style="margin:5px 0;"><strong>Tournament:</strong> ${tournament.name} (BOD #${tournament.bodNumber})</p>
      <p style="margin:5px 0;"><strong>Date:</strong> ${formattedDate}</p>
      <p style="margin:5px 0;"><strong>Location:</strong> ${tournament.location}</p>
      ${reasonHtml}
    </div>
    
    <!-- Important Notice -->
    <div style="background-color:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:15px;margin:20px 0;">
      <p style="margin:0;color:#856404;">
        <strong>⚠️ Important:</strong> Your ticket <strong>${ticketCode}</strong> is now void and cannot be used for check-in. 
        If you wish to participate in this tournament, you will need to register again.
      </p>
    </div>
    
    <hr style="border:none;border-top:1px solid #eee;margin:30px 0;" />
    
    <p style="font-size:14px;color:#666;">
      Refunds typically take 5-10 business days to appear on your statement, depending on your bank or card issuer.
    </p>
    
    <p style="font-size:14px;color:#666;">
      If you have any questions about this refund, please reply to this email or contact the tournament organizers.
    </p>
    
    <p>Thank you for your understanding.</p>
  `;

  // Plain text version
  const text = `
Refund Confirmed - ${tournament.name}

Hello ${playerName}!

We've processed your refund for ${tournament.name}.

REFUND AMOUNT: ${formatAmount(refundAmount)}
${isPartialRefund ? `(Original payment was ${formatAmount(originalAmount)})` : ""}

This amount will be credited to your original payment method.

Original Ticket Details:
- Ticket Code: ${ticketCode} (NOW VOID)
- Tournament: ${tournament.name} (BOD #${tournament.bodNumber})
- Date: ${formattedDate}
- Location: ${tournament.location}
${refundReason ? `- Reason: ${refundReason}` : ""}

⚠️ IMPORTANT: Your ticket ${ticketCode} is now void and cannot be used for check-in. If you wish to participate in this tournament, you will need to register again.

Refunds typically take 5-10 business days to appear on your statement, depending on your bank or card issuer.

If you have any questions about this refund, please reply to this email or contact the tournament organizers.

Thank you for your understanding.

---
${branding.brandName}
  `.trim();

  return {
    subject: `💳 Refund Confirmed: ${formatAmount(refundAmount)} - ${tournament.name}`,
    html: content,
    text,
  };
}

export default generateRefundConfirmationEmail;
