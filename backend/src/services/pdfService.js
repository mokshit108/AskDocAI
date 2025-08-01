const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

class PDFService {
  static async extractText(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      
      return {
        text: data.text,
        pages: data.numpages,
        info: data.info
      };
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  static async extractTextByPage(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      
      // Split text by pages (approximate)
      const textLength = data.text.length;
      const avgPageLength = Math.ceil(textLength / data.numpages);
      const pages = [];
      
      for (let i = 0; i < data.numpages; i++) {
        const start = i * avgPageLength;
        const end = Math.min((i + 1) * avgPageLength, textLength);
        pages.push({
          pageNumber: i + 1,
          text: data.text.substring(start, end)
        });
      }
      
      return pages;
    } catch (error) {
      console.error('PDF page extraction error:', error);
      throw new Error('Failed to extract pages from PDF');
    }
  }
}

module.exports = PDFService;