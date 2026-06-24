import { api } from './api';

export interface Extraction {
  name: string;
  number: string;
  category: string;
  owner: string; // family member name, or "Family" if shared
  expiryDate: string;
  confidence: number; // 0-1
}

// Real server-side multimodal extraction via the AI proxy (api/ai/extract).
// The AI key lives only on the server; the app sends the image and gets back
// validated structured fields. (Filename kept for import stability.)
export async function extractFromImage(imageBase64: string, mimeType = 'image/jpeg'): Promise<Extraction> {
  const r = await api.extract(imageBase64, mimeType);
  return {
    name: r.name,
    number: r.number ?? '',
    category: r.category,
    owner: r.owner ?? 'Family',
    expiryDate: r.expiryDate ?? '',
    confidence: r.confidence ?? 0,
  };
}
