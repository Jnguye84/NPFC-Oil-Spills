import axios from 'axios';
import pdf from 'pdf-parse';
import fs from 'fs/promises';

export async function extractTextFromPDF(pdfUrl) {
    try {
      const response = await axios.get(pdfUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        responseType: 'arraybuffer'  // Ensure the response is handled as a binary stream (PDF)
      });
  
      // Proceed with the logic to process the PDF content (e.g., using pdf-parse or other libraries)
      const pdfBuffer = Buffer.from(response.data);
      const pdfData = await pdf(pdfBuffer);
      return pdfData.text;
    } catch (error) {
      console.error('Failed to extract PDF text:', error.response?.status, error.message);
      return null;
    }
  }