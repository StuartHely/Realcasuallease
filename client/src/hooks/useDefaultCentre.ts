import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export function useDefaultCentre() {
  const { data: centres } = trpc.centres.list.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedId) return; // Already selected, don't override
    if (!centres || centres.length === 0) return;

    // Auto-select if only one centre available
    if (centres.length === 1) {
      setSelectedId(centres[0].id);
      return;
    }

    // Check localStorage for last-used centre
    const stored = localStorage.getItem("lastSelectedCentreId");
    if (stored) {
      const id = parseInt(stored);
      if (centres.some((c) => c.id === id)) {
        setSelectedId(id);
        return;
      }
    }
  }, [centres, selectedId]);

  const select = (id: number) => {
    setSelectedId(id);
    localStorage.setItem("lastSelectedCentreId", String(id));
  };

  return {
    selectedCentreId: selectedId,
    setSelectedCentreId: select,
    centres: centres ?? [],
  };
}
