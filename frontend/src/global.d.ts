// src/global.d.ts
import { PrinterClient } from '@bambulab-p1screen/printer-api'

export {};

declare module 'qrcode'

declare global {
  interface Window {
    client: PrinterClient;
  }
}
