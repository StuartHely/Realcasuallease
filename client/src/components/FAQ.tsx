import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function FAQ() {
  const { data: faqs, isLoading } = trpc.faqs.list.useQuery();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <section className="py-8 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <h3 className="text-2xl font-bold text-center text-blue-900 mb-6">
            Frequently Asked Questions
          </h3>
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      </section>
    );
  }

  if (!faqs || faqs.length === 0) {
    return null;
  }

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-8 px-4 bg-gray-50">
      <div className="container mx-auto max-w-4xl">
        <h3 className="text-2xl font-bold text-center text-blue-900 mb-6">
          Frequently Asked Questions
        </h3>
        
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <Card 
              key={faq.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => toggleFAQ(index)}
            >
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm font-medium text-blue-900 pr-8">
                  {faq.question}
                </span>
                <div className="flex-shrink-0">
                  {openIndex === index ? (
                    <ChevronUp className="h-4 w-4 text-blue-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              </div>
              
              {openIndex === index && (
                <div className="px-4 pb-3 border-t pt-2">
                  <div 
                    className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}