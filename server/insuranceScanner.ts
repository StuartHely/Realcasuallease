import { invokeLLM } from './_core/llm';

export interface InsuranceData {
  expiryDate: string | null; // ISO date string
  insuredAmount: number | null; // in millions
  policyNumber: string | null;
  insuranceCompany: string | null;
  success: boolean;
  error?: string;
}

/**
 * Scan insurance document using OCR/AI to extract key information
 * @param documentUrl - Public URL to the insurance document (PDF or image)
 * @returns Extracted insurance data
 */
export async function scanInsuranceDocument(documentUrl: string): Promise<InsuranceData> {
  try {
    console.log('[Insurance Scanner] Scanning document:', documentUrl);

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are an insurance document analyzer. Extract the following information from insurance certificates:
1. Expiry date (return in ISO format YYYY-MM-DD)
2. Insured amount (return as a number in millions, e.g., 20 for $20 million)
3. Policy number
4. Insurance company name

Return ONLY a valid JSON object with these exact keys: expiryDate, insuredAmount, policyNumber, insuranceCompany.
If any field cannot be found, use null for that field.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this insurance certificate and extract the expiry date, insured amount (in millions), policy number, and insurance company name.',
            },
            {
              type: 'file_url',
              file_url: {
                url: documentUrl,
                mime_type: 'application/pdf',
              },
            },
          ],
        },
      ],
      response_format: {
        type: 'json_object',
      },
    });

    console.log('[Insurance Scanner] Full response:', JSON.stringify(response, null, 2));
    
    // Check if API returned an error
    if ('error' in response) {
      const error = (response as any).error;
      throw new Error(`API Error: ${error.type || 'unknown'} - ${error.message || 'No message'}`);
    }
    
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No choices in AI response');
    }
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const extracted = JSON.parse(contentStr);
    
    console.log('[Insurance Scanner] Extracted data:', extracted);

    return {
      expiryDate: extracted.expiryDate,
      insuredAmount: extracted.insuredAmount,
      policyNumber: extracted.policyNumber,
      insuranceCompany: extracted.insuranceCompany,
      success: true,
    };
  } catch (error) {
    console.error('[Insurance Scanner] Error scanning document:', error);
    return {
      expiryDate: null,
      insuredAmount: null,
      policyNumber: null,
      insuranceCompany: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate insurance data meets minimum requirements
 */
export function validateInsurance(data: InsuranceData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.success) {
    errors.push('Failed to scan insurance document');
  }

  if (!data.expiryDate) {
    errors.push('Could not extract expiry date from document');
  } else {
    const expiry = new Date(data.expiryDate);
    const now = new Date();
    if (expiry < now) {
      errors.push('Insurance policy has already expired');
    }
  }

  if (!data.insuredAmount) {
    errors.push('Could not extract insured amount from document');
  } else if (data.insuredAmount < 20) {
    errors.push(`Insured amount ($${data.insuredAmount}M) is below the minimum requirement of $20M`);
  }

  if (!data.policyNumber) {
    errors.push('Could not extract policy number from document');
  }

  if (!data.insuranceCompany) {
    errors.push('Could not extract insurance company name from document');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
