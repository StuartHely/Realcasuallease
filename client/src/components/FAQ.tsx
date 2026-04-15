import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function FAQ() {
  const { data: faqs, isLoading } = trpc.faqs.list.useQuery();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [sectionOpen, setSectionOpen] = useState(false);

  if (isLoading || !faqs || faqs.length === 0) {
    return null;
  }

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-8 px-4 bg-gray-50">
      <div className="container mx-auto max-w-4xl">
        <button
          onClick={() => setSectionOpen(!sectionOpen)}
          className="w-full flex items-center justify-center gap-3 group cursor-pointer"
        >
          <h3 className="text-2xl font-bold text-[#0C4A5E] font-playfair">
            Frequently Asked Questions
          </h3>
          <div className="flex-shrink-0 mt-1">
            {sectionOpen ? (
              <ChevronUp className="h-6 w-6 text-[#0C4A5E]" />
            ) : (
              <ChevronDown className="h-6 w-6 text-[#0C4A5E]" />
            )}
          </div>
        </button>

        {sectionOpen && (
          <div className="space-y-2 mt-6">
            {faqs.map((faq, index) => (
              <Card 
                key={faq.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => toggleFAQ(index)}
              >
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm font-medium text-[#0C4A5E] pr-8">
                    {faq.question}
                  </span>
                  <div className="flex-shrink-0">
                    {openIndex === index ? (
                      <ChevronUp className="h-4 w-4 text-[#0C4A5E]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#0C4A5E]" />
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
        )}
      </div>
    </section>
  );
}
