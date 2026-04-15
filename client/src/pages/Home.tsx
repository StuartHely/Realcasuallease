import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Calendar, CheckCircle, MapPin, LogIn, LogOut, User, Mic, MicOff } from "lucide-react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import AustraliaMap from "@/components/AustraliaMap";
import FAQ from "@/components/FAQ";
import Logo from "@/components/Logo";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseSearchQuery } from "@shared/queryParser";
import { useTenant } from "@/contexts/TenantContext";


function FeedbackForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setName("");
      setEmail("");
      setCategory("general");
      setMessage("");
      setTimeout(() => setSubmitted(false), 5000);
    },
    onError: () => {
      toast.error("Failed to submit feedback. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      toast.error("Message must be at least 10 characters.");
      return;
    }
    submitMutation.mutate({
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      category: category as "general" | "suggestion" | "bug" | "complaint",
      message: message.trim(),
    });
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Thank you for your feedback!</h3>
        <p className="text-muted-foreground">We appreciate you taking the time to share your thoughts.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Name (optional)</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Email (optional)</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="suggestion">Suggestion</SelectItem>
            <SelectItem value="bug">Bug Report</SelectItem>
            <SelectItem value="complaint">Complaint</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Message *</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you think..."
          rows={4}
          required
          minLength={10}
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
        {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
      </Button>
    </form>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const tenant = useTenant();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechToText((transcript) => {
    setSearchQuery(transcript);
    inputRef.current?.focus();
  });

  // Debounced search for autocomplete
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      // Extract centre name part for autocomplete (remove date, size, etc.)
      const parsed = parseSearchQuery(searchQuery);
      setDebouncedQuery(parsed.centreName);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch suggestions based on centre name
  const { data: suggestions = [] } = trpc.centres.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  // Fetch all centres for map
  const { data: allCentres = [] } = trpc.centres.list.useQuery();

  const { data: heroData } = trpc.systemConfig.getHeroImageUrl.useQuery();
  const heroImageUrl = heroData?.heroImageUrl || null;

  // Show suggestions when typing
  useEffect(() => {
    if (debouncedQuery.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedQuery, suggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    // Parse the query to extract date
    const parsed = parseSearchQuery(searchQuery);
    
    // Build search params
    const searchParams = new URLSearchParams({
      query: searchQuery,
    });
    
    // If date was parsed from query, include it; otherwise use today
    if (parsed.parsedDate) {
      searchParams.set("date", parsed.parsedDate);
    } else {
      // Default to today if no date specified
      searchParams.set("date", format(new Date(), "yyyy-MM-dd"));
    }
    
    // Include end date if it's a range
    if (parsed.dateRangeEnd) {
      searchParams.set("endDate", parsed.dateRangeEnd);
    }
    
    setLocation(`/search?${searchParams.toString()}`);
  };

  const selectSuggestion = (name: string) => {
    // Replace the centre name part in the query while keeping other parts
    const parsed = parseSearchQuery(searchQuery);
    
    // Build the new query with the selected centre name
    let newQuery = name;
    
    // Add back size if it was in the original query
    if (parsed.minSizeM2) {
      // Try to find the original size pattern and append it
      const sizeMatch = searchQuery.match(/(\d+\.?\d*\s*m?\s*(?:[xX×]|by)\s*\d+\.?\d*\s*m?|\d+\.?\d*\s*(?:sqm|sq\s*m|square\s*meters?|m2|m\s*2))/i);
      if (sizeMatch) {
        newQuery += " " + sizeMatch[1];
      }
    }
    
    // Add back category if it was in the original query
    if (parsed.productCategory) {
      newQuery += " " + parsed.productCategory;
    }
    
    // Add back date if it was in the original query
    if (parsed.parsedDate) {
      // Try to find the original date pattern and append it
      const datePatterns = [
        /\b(?:from|on|for)?\s*\d{1,2}(?:st|nd|rd|th)?\s+(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)(?:\s+\d{4})?\b/i,
        /\b(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+\d{4})?\b/i,
        /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/,
        /\b(?:today|tomorrow)\b/i,
        /\b(?:next|this)?\s*(?:sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/i,
      ];
      
      for (const pattern of datePatterns) {
        const match = searchQuery.match(pattern);
        if (match) {
          newQuery += " " + match[0];
          break;
        }
      }
    }
    
    setSearchQuery(newQuery);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter key to trigger search when suggestions are not shown
    if (e.key === "Enter" && (!showSuggestions || suggestions.length === 0)) {
      e.preventDefault();
      handleSearch();
      return;
    }
    
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex].name);
        } else {
          handleSearch();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Parse current query to show detected date
  const parsedQuery = parseSearchQuery(searchQuery);
  const hasDetectedDate = !!parsedQuery.parsedDate;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div 
           className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity relative z-50"
           onClick={() => setLocation("/")}
           style={{}}
          >
           <Logo width={240} height={61} />
          </div>
          <nav className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" onClick={() => setLocation("/my-bookings")}>My Bookings</Button>
                <Button variant="ghost" onClick={() => setLocation("/profile")}>
                  <User className="h-4 w-4 mr-1" />
                  {user?.name || "Profile"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await logout();
                    toast.success("Logged out");
                    setLocation("/login");
                  }}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="default" size="sm">
                    <LogIn className="h-4 w-4 mr-1" />
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section with Background Image */}
        <section
          className={`relative flex flex-col items-center justify-center overflow-hidden ${heroImageUrl ? '' : 'bg-[#0C4A5E]'}`}
          style={{ minHeight: 520, padding: '40px 24px 60px' }}
        >
          {heroImageUrl && (
            <>
              <img
                src={heroImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
              <div
                className="absolute inset-0 z-[1]"
                style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.75) 100%)' }}
              />
            </>
          )}

          {/* Hero Content */}
          <div className="relative z-[2] text-center max-w-[780px] mb-6">
            <span className="inline-block bg-[#D4A843]/20 border border-[#D4A843]/40 text-[#D4A843] text-xs font-semibold tracking-[1.5px] uppercase px-4 py-1.5 rounded-full mb-4">
              Intelligent Casual Leasing
            </span>
            <h2 className="text-[28px] md:text-[42px] font-bold text-white leading-[1.15] mb-2.5 font-playfair">
              Find and Book Your <span className="text-[#D4A843]">Perfect Space</span>
            </h2>
            <p className="text-[15px] md:text-[17px] text-white/80 leading-relaxed">
              Describe what you need in plain English. We'll match you to available sites instantly.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative z-[3] w-full max-w-[960px]">
            <div className="bg-white rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.06)] px-7 pt-6 pb-5">
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4">
                <p className="text-left font-bold text-slate-600" style={{ fontSize: '19px' }}>
                  Describe the space you need and we'll handle the rest.
                </p>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="Eg. I want to sell candles from 4 tables in October in Western Sydney"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => {
                        if (debouncedQuery.length >= 2 && suggestions.length > 0) {
                          setShowSuggestions(true);
                        }
                      }}
                      className="h-16 pl-12 pr-12 placeholder:text-gray-500" style={{ fontSize: '21px' }}
                      autoComplete="off"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    {speech.isSupported && (
                      <button
                        type="button"
                        onClick={() => { speech.toggle(); inputRef.current?.focus(); }}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${
                          speech.isListening
                            ? "bg-red-100 text-red-600 animate-pulse"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {speech.isListening ? <Mic className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </button>
                    )}
                    {showSuggestions && suggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {suggestions.map((centre, index) => (
                          <div
                            key={centre.id}
                            onClick={() => selectSuggestion(centre.name)}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              index === selectedIndex
                                ? "bg-blue-50 text-blue-900"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="font-medium">{centre.name}</div>
                            {centre.suburb && (
                              <div className="text-sm text-gray-500">
                                {centre.suburb}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-16 px-10 bg-[#0C4A5E] hover:bg-[#0a3e50] text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
                    disabled={!searchQuery.trim()}
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Search
                  </Button>
                </div>

                {/* Show detected date feedback — subdued styling */}
                {searchQuery.trim() && (
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    {hasDetectedDate ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Date detected: {format(new Date(parsedQuery.parsedDate!), "EEEE, d MMMM yyyy")}
                        {parsedQuery.dateRangeEnd && (
                          <span> to {format(new Date(parsedQuery.dateRangeEnd), "d MMMM yyyy")}</span>
                        )}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        No date detected — will use today's date
                      </span>
                    )}
                  </div>
                )}
              </form>

              {/* State Filter Chips */}
              <div className="mt-3 pt-4 rounded-lg bg-gray-50/80 px-1 pb-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Or filter by state</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { code: "NSW", name: "New South Wales" },
                    { code: "VIC", name: "Victoria" },
                    { code: "QLD", name: "Queensland" },
                    { code: "SA", name: "South Australia" },
                    { code: "WA", name: "Western Australia" },
                    { code: "TAS", name: "Tasmania" },
                    { code: "ACT", name: "Australian Capital Territory" },
                    { code: "NT", name: "Northern Territory" },
                  ].map((state) => (
                    <Button
                      key={state.code}
                      onClick={() => setLocation(`/centres?state=${state.code}`)}
                      variant="outline"
                      className="bg-white hover:bg-white border border-[#0C4A5E]/20 hover:border-[#0C4A5E]/50 text-[#0C4A5E] font-semibold px-5 py-2 h-auto text-sm"
                    >
                      <MapPin className="mr-1.5 h-3.5 w-3.5" />
                      {state.code}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Australia Map */}
        <section className="pb-8 px-4 bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto max-w-5xl">
            <div className="mt-4">
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl">Explore Centres Across Australia</CardTitle>
                  <CardDescription>Click on any marker to view centre details</CardDescription>
                </CardHeader>
                <CardContent>
                  <AustraliaMap centres={allCentres} />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="pt-4 pb-10 px-4 bg-white">
          <div className="container mx-auto max-w-6xl">
            <h3 className="text-3xl font-bold text-center text-[#0C4A5E] mb-12 font-playfair">
              How It Works
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-[#0C4A5E]/10 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-[#0C4A5E]" />
                  </div>
                  <CardTitle>1. Search</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Enter what you need in natural language - centre name, size, product type, and date all in one search.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-[#0C4A5E]/10 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-[#0C4A5E]" />
                  </div>
                  <CardTitle>2. Compare</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Instant matched results. No phone or email tag. No dropdown menus.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-[#D4A843]/15 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-[#D4A843]" />
                  </div>
                  <CardTitle>3. Book</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Book instantly online and receive confirmation. It's that simple.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQ />

        {/* Feedback & Suggestions Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Feedback & Suggestions</CardTitle>
                <CardDescription>We'd love to hear from you. Share your thoughts, ideas, or report an issue.</CardDescription>
              </CardHeader>
              <CardContent>
                <FeedbackForm />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0C4A5E] text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} {tenant.brandName}. All rights reserved.</p>
          {tenant.brandFooterText && (
            <p className="mt-2 text-sm opacity-75">{tenant.brandFooterText}</p>
          )}
        </div>
      </footer>
    </div>
  );
}
