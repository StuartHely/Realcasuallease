import { AlertTriangle, CheckCircle, XCircle, ExternalLink, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface InsuranceStatusProps {
  insuranceScan: {
    expiryDate: string | null;
    insuredAmount: number | null;
    policyNumber: string | null;
    insuranceCompany: string | null;
    success: boolean;
    error?: string;
  } | null;
  insuranceValidation: {
    valid: boolean;
    errors: string[];
  };
  insuranceDocumentUrl: string | null;
}

export function InsuranceStatusDisplay({
  insuranceScan,
  insuranceValidation,
  insuranceDocumentUrl,
}: InsuranceStatusProps) {
  // No insurance uploaded
  if (!insuranceDocumentUrl) {
    return (
      <Alert variant="destructive" className="mb-4">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>No Insurance Document</strong>
          <p className="mt-1 text-sm">Customer has not uploaded an insurance certificate.</p>
        </AlertDescription>
      </Alert>
    );
  }

  // Insurance uploaded but scan failed
  if (!insuranceScan || !insuranceScan.success) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Insurance Document Unreadable</strong>
          <p className="mt-1 text-sm">
            {insuranceScan?.error || "Could not extract information from the insurance document"}
          </p>
          <p className="mt-2 text-sm font-semibold">⚠️ Manual review required</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => window.open(insuranceDocumentUrl, '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Document
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Insurance scanned but has validation errors
  if (!insuranceValidation.valid) {
    return (
      <Alert variant="destructive" className="mb-4">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Insurance Issues Found</strong>
          <div className="mt-2 space-y-1">
            {insuranceValidation.errors.map((error, idx) => (
              <p key={idx} className="text-sm">❌ {error}</p>
            ))}
          </div>
          <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
            <p className="font-semibold mb-1">Extracted Information:</p>
            <p>Expiry: {insuranceScan.expiryDate ? new Date(insuranceScan.expiryDate).toLocaleDateString() : 'Not found'}</p>
            <p>Coverage: {insuranceScan.insuredAmount ? `$${insuranceScan.insuredAmount}M` : 'Not found'}</p>
            <p>Policy: {insuranceScan.policyNumber || 'Not found'}</p>
            <p>Company: {insuranceScan.insuranceCompany || 'Not found'}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => window.open(insuranceDocumentUrl, '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Document
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Insurance is valid
  return (
    <Alert className="mb-4 border-green-200 bg-green-50">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription>
        <strong className="text-green-800">Insurance Verified ✓</strong>
        <div className="mt-2 space-y-1 text-sm text-green-700">
          <p>✓ Expiry: {new Date(insuranceScan.expiryDate!).toLocaleDateString()}</p>
          <p>✓ Coverage: ${insuranceScan.insuredAmount}M</p>
          <p>✓ Policy: {insuranceScan.policyNumber}</p>
          <p>✓ Company: {insuranceScan.insuranceCompany}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => window.open(insuranceDocumentUrl, '_blank')}
        >
          <FileText className="mr-2 h-4 w-4" />
          View Document
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Quick rejection templates for common insurance issues
 */
export const INSURANCE_REJECTION_TEMPLATES = [
  "Insurance has expired - please upload a current certificate with expiry date at least 6 months in the future",
  "Insurance coverage insufficient - certificate must show minimum $20M public liability coverage",
  "Insurance document is unreadable - please upload a clear, high-resolution PDF or photo showing all required information",
  "Wrong document uploaded - please upload your Public Liability Insurance certificate",
  "Policy details unclear - please upload a complete insurance certificate showing expiry date, coverage amount, policy number, and insurance company name",
];
