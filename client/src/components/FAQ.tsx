import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FAQ() {
  const { data: faqs, isLoading } = trpc.faqs.list.useQuery();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-3xl font-bold text-center text-blue-900 mb-12">
            Frequently Asked Questions
          </h3>
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      </section>
    );
  }

  if (!faqs || faqs.length === 0) {
    return null; // Don't show section if no FAQs
  }

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="container mx-auto max-w-4xl">
        <h3 className="text-3xl font-bold text-center text-blue-900 mb-12">
          Frequently Asked Questions
        </h3>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card 
              key={faq.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => toggleFAQ(index)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg text-blue-900 pr-8">
                    {faq.question}
                  </CardTitle>
                  <div className="flex-shrink-0">
                    {openIndex === index ? (
                      <ChevronUp className="h-5 w-5 text-blue-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {openIndex === index && (
                <CardContent>
                  <div 
                    className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                  />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
