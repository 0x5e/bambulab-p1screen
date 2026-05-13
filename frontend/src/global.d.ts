// src/global.d.ts
import { PrinterClient } from "./api/PrinterClient";

export {};

declare module 'qrcode'

declare global {
  interface Window {
    client: PrinterClient;
  }
}
