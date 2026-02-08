import QRCode from 'qrcode';
import logger from '../utils/logger';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

const DEFAULT_OPTIONS: QRCodeOptions = {
  width: 300,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
  errorCorrectionLevel: 'M',
};

/**
 * Generate QR code as Base64 PNG data URL
 */
export const generateQRCodeDataURL = async (
  data: string,
  options: QRCodeOptions = {}
): Promise<string> => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    const dataUrl = await QRCode.toDataURL(data, {
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
    });
    
    return dataUrl;
  } catch (error) {
    logger.error('Failed to generate QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as Base64 PNG (without data URL prefix)
 */
export const generateQRCodeBase64 = async (
  data: string,
  options: QRCodeOptions = {}
): Promise<string> => {
  const dataUrl = await generateQRCodeDataURL(data, options);
  
  // Remove the data URL prefix to get just the base64 data
  return dataUrl.replace(/^data:image\/png;base64,/, '');
};

/**
 * Generate QR code as Buffer
 */
export const generateQRCodeBuffer = async (
  data: string,
  options: QRCodeOptions = {}
): Promise<Buffer> => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    const buffer = await QRCode.toBuffer(data, {
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
    });
    
    return buffer;
  } catch (error) {
    logger.error('Failed to generate QR code buffer:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate ticket QR code data
 * The QR code contains a URL that the scanner app will use
 */
export const generateTicketQRData = (
  ticketCode: string,
  baseUrl?: string
): string => {
  // If baseUrl is provided, generate a scannable URL
  // Otherwise just use the ticket code
  if (baseUrl) {
    return `${baseUrl}/scan/${ticketCode}`;
  }
  
  // For simpler scanning, just use the ticket code
  // The scanner app knows to look up this code
  return ticketCode;
};

/**
 * Generate QR code for a tournament ticket
 */
export const generateTicketQRCode = async (
  ticketCode: string,
  baseUrl?: string,
  options: QRCodeOptions = {}
): Promise<string> => {
  const qrData = generateTicketQRData(ticketCode, baseUrl);
  
  // Use higher error correction for tickets (more forgiving if damaged)
  const ticketOptions: QRCodeOptions = {
    ...options,
    errorCorrectionLevel: options.errorCorrectionLevel || 'H',
    width: options.width || 400,
  };
  
  return generateQRCodeDataURL(qrData, ticketOptions);
};

export default {
  generateQRCodeDataURL,
  generateQRCodeBase64,
  generateQRCodeBuffer,
  generateTicketQRData,
  generateTicketQRCode,
};
