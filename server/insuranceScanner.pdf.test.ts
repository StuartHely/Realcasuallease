import { describe, it, expect } from 'vitest';

describe('Insurance Scanner PDF Support', () => {
  it('should detect PDF files by extension', () => {
    const pdfUrls = [
      'https://example.com/insurance.pdf',
      'https://example.com/policy.PDF',
      'https://s3.amazonaws.com/docs/certificate.pdf',
    ];
    
    pdfUrls.forEach(url => {
      expect(url.toLowerCase().endsWith('.pdf')).toBe(true);
    });
  });

  it('should detect image files by extension', () => {
    const imageUrls = [
      'https://example.com/insurance.jpg',
      'https://example.com/policy.jpeg',
      'https://example.com/cert.png',
    ];
    
    imageUrls.forEach(url => {
      expect(url.toLowerCase().endsWith('.pdf')).toBe(false);
    });
  });

  it('should use correct content type for PDFs', () => {
    const documentUrl = 'https://example.com/insurance.pdf';
    const isPdf = documentUrl.toLowerCase().endsWith('.pdf');
    
    const contentType = isPdf 
      ? { type: 'file_url', file_url: { url: documentUrl, mime_type: 'application/pdf' } }
      : { type: 'image_url', image_url: { url: documentUrl, detail: 'high' } };
    
    expect(contentType.type).toBe('file_url');
    expect((contentType as any).file_url.mime_type).toBe('application/pdf');
  });

  it('should use correct content type for images', () => {
    const documentUrl = 'https://example.com/insurance.jpg';
    const isPdf = documentUrl.toLowerCase().endsWith('.pdf');
    
    const contentType = isPdf 
      ? { type: 'file_url', file_url: { url: documentUrl, mime_type: 'application/pdf' } }
      : { type: 'image_url', image_url: { url: documentUrl, detail: 'high' } };
    
    expect(contentType.type).toBe('image_url');
    expect((contentType as any).image_url.detail).toBe('high');
  });

  it('should handle case-insensitive PDF detection', () => {
    const mixedCaseUrls = [
      'https://example.com/doc.PDF',
      'https://example.com/doc.Pdf',
      'https://example.com/doc.pDf',
    ];
    
    mixedCaseUrls.forEach(url => {
      expect(url.toLowerCase().endsWith('.pdf')).toBe(true);
    });
  });
});
