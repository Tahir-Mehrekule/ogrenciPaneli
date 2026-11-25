import React from "react";
import apiClient from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import toast from "react-hot-toast";

export interface CourseCategory {
  id: string;
  name: string;
  color?: string | null;
}

export function CourseCategories({ courseId }: { courseId: string }) {
  const [categories, setCategories] = React.useState<CourseCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState("#6366f1");
  const [adding, setAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await apiClient.get<CourseCategory[]>(
          `/api/v1/courses/${courseId}/categories`
        );
        setCategories(data ?? []);
      } catch {
        /* kategori listesi sessizce bos kalir */
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [courseId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cname = newName.trim();
    if (!cname) return;
    setAdding(true);
    try {
      const { data } = await apiClient.post<CourseCategory>(
        `/api/v1/courses/${courseId}/categories`,
        { name: cname, color: newColor }
      );
      setCategories((prev) => [...prev, data]);
      setNewName("");
      toast.success("Kategori eklendi.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Kategori eklenemedi."));
    } finally {
      setAdding(false);
    }
  };

  const handleSave = async (id: string) => {
    const cname = editName.trim();
    if (!cname) return;
    try {
      const { data } = await apiClient.patch<CourseCategory>(`/api/v1/categories/${id}`, {
        name: cname,
      });
      setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
      setEditingId(null);
      toast.success("Kategori guncellendi.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Guncelleme basarisiz."));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kategori silinsin mi? Aktif projesi varsa islem reddedilir.")) return;
    try {
      await apiClient.delete(`/api/v1/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success("Kategori silindi.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Silme basarisiz."));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proje Kategorileri</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Bu derse ait proje kategorileri — aktif projesi olan kategori silinemez.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
          <div className="min-w-44 flex-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Kategori adi (orn: 2. Sinif Projeleri)"
              maxLength={100}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            title="Kategori rengi"
            className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200 bg-transparent dark:border-slate-700"
          />
          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {adding ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>

        {loading ? (
          <p className="py-4 text-center text-sm text-gray-500">Yukleniyor...</p>
        ) : categories.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            Henuz kategori yok — ilk kategoriyi yukaridan ekleyin.
          </p>
        ) : (
          <div className="space-y-1.5">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 dark:border-slate-700"
              >
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color ?? "#6366f1" }}
                />
                {editingId === c.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={100}
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <button
                      onClick={() => handleSave(c.id)}
                      className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-500/10"
                      title="Kaydet"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-700/50"
                      title="Iptal"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-gray-200">
                      {c.name}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
                      title="Duzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
