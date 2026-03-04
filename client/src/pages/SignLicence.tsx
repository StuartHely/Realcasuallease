import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Loader2, CheckCircle2, AlertCircle, FileText, Calendar, Building2, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function SignLicence() {
  const { token } = useParams<{ token: string }>();
  const [signedByName, setSignedByName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);

  const bookingQuery = trpc.licence.getByToken.useQuery(
    { token: token! },
    { enabled: !!token }
  );

  const termsQuery = trpc.licence.getTerms.useQuery();

  const signMutation = trpc.licence.sign.useMutation({
    onSuccess: () => {
      setSigned(true);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to sign licence agreement");
    },
  });

  const isValid = signedByName.trim().length >= 2 && agreed;
  const booking = bookingQuery.data;
  const alreadySigned = booking?.licenceSignedAt;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !token) return;
    signMutation.mutate({ token, signedByName: signedByName.trim() });
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  if (bookingQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#123047]" />
      </div>
    );
  }

  if (bookingQuery.isError || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900">Invalid or Expired Link</h2>
            <p className="text-muted-foreground">
              This licence signing link is invalid or has expired. Please contact CasualLease support for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadySigned || signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {signed ? "🎉 Licence Signed!" : "Licence Already Signed"}
            </h2>
            <p className="text-muted-foreground">
              {signed
                ? "Thank you! Your licence agreement has been successfully signed. You will receive a confirmation email shortly."
                : `This licence was signed on ${formatDate(booking.licenceSignedAt!)}.`}
            </p>
            <p className="text-sm text-muted-foreground">
              Booking #{booking.bookingNumber}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-[700px] mx-auto space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/">
            <span className="inline-flex items-center gap-2 text-[#123047] cursor-pointer">
              <MapPin className="h-8 w-8" />
              <span className="text-2xl font-bold">CasualLease</span>
            </span>
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-center text-[#123047]">
          Licence Agreement
        </h1>

        {/* Booking Summary */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-[#123047]">
              <FileText className="h-5 w-5" />
              Booking Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Booking Number</p>
                <p className="font-semibold">#{booking.bookingNumber}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Centre
                </p>
                <p className="font-semibold">{booking.centreName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Site / Asset</p>
                <p className="font-semibold">{booking.assetNumber}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Dates
                </p>
                <p className="font-semibold">
                  {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
                </p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Total Amount
                </p>
                <p className="text-xl font-bold text-[#123047]">
                  {formatCurrency(Number(booking.totalAmount))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#123047]">
              Terms & Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {termsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#123047]" />
              </div>
            ) : (
              <div
                className="max-h-[400px] overflow-y-auto border rounded-md p-4 bg-white text-sm leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: termsQuery.data?.terms ?? "<p>Terms and conditions not available.</p>",
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Signature Form */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#123047]">
              Sign Agreement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signedByName">Full Name</Label>
                <Input
                  id="signedByName"
                  type="text"
                  placeholder="Enter your full name"
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                  disabled={signMutation.isPending}
                  required
                  minLength={2}
                />
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  disabled={signMutation.isPending}
                />
                <Label
                  htmlFor="agree"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  I have read and agree to the Terms & Conditions above
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg"
                style={{ backgroundColor: "#123047" }}
                size="lg"
                disabled={!isValid || signMutation.isPending}
              >
                {signMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  "Sign Licence Agreement"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground pb-4">
          © {new Date().getFullYear()} CasualLease. All rights reserved.
        </p>
      </div>
    </div>
  );
}
