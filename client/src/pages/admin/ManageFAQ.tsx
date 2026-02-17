import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Save, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminFAQ() {
  const { data: faqs, isLoading, refetch } = trpc.faqs.listAll.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    displayOrder: 0,
    isActive: true,
  });

  const createMutation = trpc.faqs.create.useMutation({
    onSuccess: () => {
      toast.success("FAQ created successfully");
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create FAQ: " + error.message);
    },
  });

  const updateMutation = trpc.faqs.update.useMutation({
    onSuccess: () => {
      toast.success("FAQ updated successfully");
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to update FAQ: " + error.message);
    },
  });

  const deleteMutation = trpc.faqs.delete.useMutation({
    onSuccess: () => {
      toast.success("FAQ deleted successfully");
      refetch();
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: (error) => {
      toast.error("Failed to delete FAQ: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      question: "",
      answer: "",
      displayOrder: 0,
      isActive: true,
    });
    setEditingId(null);
    setIsCreating(false);
  };

  const handleEdit = (faq: any) => {
    setFormData({
      question: faq.question,
      answer: faq.answer,
      displayOrder: faq.displayOrder,
      isActive: faq.isActive,
    });
    setEditingId(faq.id);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setFormData({
      question: "",
      answer: "",
      displayOrder: faqs ? faqs.length : 0,
      isActive: true,
    });
    setIsCreating(true);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
      });
    } else if (isCreating) {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate({ id: deletingId });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <p className="text-gray-600">Loading FAQs...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Manage FAQs</h1>
            <p className="text-muted-foreground mt-2">
              Manage frequently asked questions displayed on the homepage
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add FAQ
          </Button>
        </div>

        {/* Edit/Create Form */}
        {(isCreating || editingId) && (
          <Card className="border-blue-500">
            <CardHeader>
              <CardTitle>
                {isCreating ? "Create New FAQ" : "Edit FAQ"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Question *</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  placeholder="e.g., How do I book a site?"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">
                  {formData.question.length}/500 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="answer">Answer *</Label>
                <Textarea
                  id="answer"
                  value={formData.answer}
                  onChange={(e) =>
                    setFormData({ ...formData, answer: e.target.value })
                  }
                  placeholder="Enter detailed answer..."
                  rows={6}
                />
                <p className="text-xs text-gray-500">
                  You can use basic HTML like &lt;strong&gt;, &lt;br&gt;, &lt;ul&gt;, &lt;li&gt;
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        displayOrder: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Lower numbers appear first
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="isActive">Active</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                    <span className="text-sm text-gray-600">
                      {formData.isActive
                        ? "Visible on homepage"
                        : "Hidden from homepage"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save FAQ
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQ List */}
        <div className="space-y-4">
          {!faqs || faqs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600">
                  No FAQs yet. Click "Add FAQ" to create one.
                </p>
              </CardContent>
            </Card>
          ) : (
            faqs.map((faq) => (
              <Card
                key={faq.id}
                className={editingId === faq.id ? "border-blue-500" : ""}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 pt-1 cursor-move">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-blue-900">
                            {faq.question}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Order: {faq.displayOrder} •{" "}
                            {faq.isActive ? (
                              <span className="text-green-600">Active</span>
                            ) : (
                              <span className="text-gray-500">Inactive</span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(faq)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(faq.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>

                      <div
                        className="text-gray-700 text-sm mt-2 line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: faq.answer }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete FAQ</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this FAQ? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
