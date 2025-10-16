import QRCode from 'qrcode';

export async function createSvgQr(content: string) {
  return QRCode.toString(content, { type: 'svg', margin: 2, color: { dark: '#063c46', light: '#ffffff00' } });
}
