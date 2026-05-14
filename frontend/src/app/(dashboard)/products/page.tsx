'use client';
import { useRef, useState } from 'react';
import { Product } from '../../../types';
import { useProducts } from '../../../hooks/useProducts';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { Input, Select } from '../../../components/ui/Input';
import { ProductImage, getCategoryConfig } from '../../../components/ui/ProductImage';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Package, Pencil, Camera, X, Trash2 } from 'lucide-react';

const CATEGORIES = ['Grocery', 'Dairy', 'Bakery', 'Beverages', 'Snacks', 'Pharmacy', 'Personal Care', 'Household', 'Vegetables', 'Fruits', 'Meat', 'Other'];
const EMPTY_FORM = { name: '', barcode: '', price: '', cost: '', category: 'Grocery', initialStock: '0', reorderLevel: '10' };

export default function ProductsPage() {
  const { products, loading, refresh } = useProducts();
  const [search, setSearch] = useState('');

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addImage, setAddImage] = useState<File | null>(null);
  const [addPreview, setAddPreview] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<number | null>(null);

  // Edit modal
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ name: '', barcode: '', price: '', cost: '', category: '' });
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string>('');
  const [editing, setEditing] = useState(false);

  const addFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const setAdd = (k: string, v: string) => setAddForm((f) => ({ ...f, [k]: v }));
  const setEdit = (k: string, v: string) => setEditForm((f) => ({ ...f, [k]: v }));

  const handleImagePick = (file: File, mode: 'add' | 'edit') => {
    const url = URL.createObjectURL(file);
    if (mode === 'add') { setAddImage(file); setAddPreview(url); }
    else { setEditImage(file); setEditPreview(url); }
  };

  // ── Create product ──
  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/inventory/products', {
        ...addForm, price: +addForm.price, cost: +addForm.cost,
        initialStock: +addForm.initialStock, reorderLevel: +addForm.reorderLevel,
      });
      // Upload image if selected
      if (addImage) {
        const fd = new FormData();
        fd.append('image', addImage);
        await api.post(`/inventory/products/${res.data.id}/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success('Product created');
      setAddForm(EMPTY_FORM); setAddImage(null); setAddPreview('');
      setShowAdd(false); refresh();
    } catch (e: any) {
      const msg = e.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to create product');
    } finally { setSaving(false); }
  };

  // ── Edit product ──
  const openEdit = (p: Product) => {
    setEditProduct(p);
    setEditForm({ name: p.name, barcode: p.barcode || '', price: String(p.price), cost: String(p.cost), category: p.category || 'Other' });
    setEditImage(null);
    const raw = p.image_url || '';
    setEditPreview(
      raw && !raw.startsWith('http')
        ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001'}${raw}`
        : raw
    );
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.patch(`/inventory/products/${id}/delete`);
      toast.success('Product deleted');
      refresh();
    } catch { toast.error('Failed to delete product'); }
    finally { setDeleting(null); }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    setEditing(true);
    try {
      await api.patch(`/inventory/products/${editProduct.id}`, {
        name: editForm.name, barcode: editForm.barcode || undefined,
        price: +editForm.price, cost: +editForm.cost, category: editForm.category,
      });
      if (editImage) {
        const fd = new FormData();
        fd.append('image', editImage);
        await api.post(`/inventory/products/${editProduct.id}/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success('Product updated');
      setEditProduct(null); setEditImage(null); setEditPreview('');
      refresh();
    } catch (e: any) {
      const msg = e.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to update product');
    } finally { setEditing(false); }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode || '').includes(search) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <Card padding={false}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input placeholder="Search products…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-ink-200 rounded-lg text-sm bg-white" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-400">{filtered.length} products</span>
            <Button size="sm" icon={<Plus size={15} />} onClick={() => setShowAdd(true)}>
              Add Product
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-ink-400 text-sm">Loading products…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={32} className="mx-auto mb-2 text-ink-200" />
            <p className="text-sm text-ink-400">{search ? 'No products match your search' : 'No products yet'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="mob-cards w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {['Product', 'Barcode', 'Category', 'Price', 'Cost', 'Stock', 'Status', ''].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide ${['Price', 'Cost'].includes(h) ? 'text-right' : ['Stock', 'Status'].includes(h) ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const qty = p.inventory?.quantity ?? 0;
                const reorder = p.inventory?.reorder_level ?? 10;
                const statusVariant = qty <= 0 ? 'coral' : qty <= reorder ? 'amber' : 'teal';
                const statusLabel = qty <= 0 ? 'Out of stock' : qty <= reorder ? 'Low stock' : 'In stock';
                return (
                  <tr key={p.id} className="border-b border-ink-50 hover:bg-ink-50 transition-colors last:border-0">
                    <td data-label="Product" className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage imageUrl={p.image_url} category={p.category} name={p.name} size={40} />
                        <p className="font-semibold text-ink-800">{p.name}</p>
                      </div>
                    </td>
                    <td data-label="Barcode" className="px-4 py-3">
                      <code className="text-xs text-ink-400 bg-ink-100 px-1.5 py-0.5 rounded">{p.barcode || '—'}</code>
                    </td>
                    <td data-label="Category" className="px-4 py-3">
                      {p.category ? <Badge variant="gray">{p.category}</Badge> : <span className="text-ink-300">—</span>}
                    </td>
                    <td data-label="Price" className="px-4 py-3 text-right font-bold" style={{ color: '#FF7A00' }}>{LKR(p.price)}</td>
                    <td data-label="Cost" className="px-4 py-3 text-right text-ink-400">{LKR(p.cost)}</td>
                    <td data-label="Stock" className="px-4 py-3 text-center font-bold text-ink-700">{qty}</td>
                    <td data-label="Status" className="px-4 py-3 text-center"><Badge variant={statusVariant} dot>{statusLabel}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="xs" variant="ghost" icon={<Pencil size={13} />} onClick={() => openEdit(p)}>Edit</Button>
                        <button onClick={() => deleteProduct(p.id)} disabled={deleting === p.id}
                          className="p-1.5 rounded-lg text-ink-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {/* ── ADD PRODUCT MODAL ── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setAddImage(null); setAddPreview(''); }} title="Add New Product" width="max-w-xl">
        <form onSubmit={submitAdd} className="space-y-4">
          {/* Image picker */}
          <ImagePicker
            preview={addPreview}
            category={addForm.category}
            name={addForm.name}
            fileRef={addFileRef}
            onPick={(f) => handleImagePick(f, 'add')}
            onClear={() => { setAddImage(null); setAddPreview(''); }}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Product Name" placeholder="e.g. Basmati Rice 1kg" required
                value={addForm.name} onChange={(e) => setAdd('name', e.target.value)} />
            </div>
            <Input label="Barcode" placeholder="e.g. 4890001000011"
              value={addForm.barcode} onChange={(e) => setAdd('barcode', e.target.value)} />
            <Select label="Category" value={addForm.category} onChange={(e) => setAdd('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <Input label="Selling Price (LKR)" type="number" placeholder="0.00" required min="0.01" step="0.01"
              value={addForm.price} onChange={(e) => setAdd('price', e.target.value)} />
            <Input label="Cost Price (LKR)" type="number" placeholder="0.00" min="0" step="0.01"
              value={addForm.cost} onChange={(e) => setAdd('cost', e.target.value)} />
            <Input label="Initial Stock" type="number" placeholder="0" min="0" step="1"
              value={addForm.initialStock} onChange={(e) => setAdd('initialStock', e.target.value)} />
            <Input label="Reorder Level" type="number" placeholder="10" min="0" step="1"
              value={addForm.reorderLevel} onChange={(e) => setAdd('reorderLevel', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={saving}>Save Product</Button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT PRODUCT MODAL ── */}
      <Modal open={!!editProduct} onClose={() => { setEditProduct(null); setEditImage(null); setEditPreview(''); }} title="Edit Product" width="max-w-xl">
        <form onSubmit={submitEdit} className="space-y-4">
          <ImagePicker
            preview={editPreview}
            category={editForm.category}
            name={editForm.name}
            fileRef={editFileRef}
            onPick={(f) => handleImagePick(f, 'edit')}
            onClear={() => { setEditImage(null); setEditPreview(''); }}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Product Name" required
                value={editForm.name} onChange={(e) => setEdit('name', e.target.value)} />
            </div>
            <Input label="Barcode"
              value={editForm.barcode} onChange={(e) => setEdit('barcode', e.target.value)} />
            <Select label="Category" value={editForm.category} onChange={(e) => setEdit('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <Input label="Selling Price (LKR)" type="number" required
              value={editForm.price} onChange={(e) => setEdit('price', e.target.value)} />
            <Input label="Cost Price (LKR)" type="number"
              value={editForm.cost} onChange={(e) => setEdit('cost', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setEditProduct(null)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={editing}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Reusable image picker component ──
interface ImagePickerProps {
  preview: string;
  category: string;
  name: string;
  fileRef: React.RefObject<HTMLInputElement>;
  onPick: (f: File) => void;
  onClear: () => void;
}

function ImagePicker({ preview, category, name, fileRef, onPick, onClear }: ImagePickerProps) {
  const cfg = getCategoryConfig(category);
  return (
    <div className="flex items-center gap-4">
      {/* Preview */}
      <div className="relative flex-shrink-0">
        {preview ? (
          <img src={preview} alt="preview"
            className="w-20 h-20 rounded-xl object-cover border border-ink-200" />
        ) : (
          <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl border border-ink-200"
            style={{ background: cfg.bg }}>
            {cfg.emoji}
          </div>
        )}
        {preview && (
          <button type="button" onClick={onClear}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
            <X size={10} />
          </button>
        )}
      </div>

      {/* Upload button */}
      <div>
        <p className="text-sm font-semibold text-ink-700 mb-1">Product Image</p>
        <p className="text-xs text-ink-400 mb-2">JPG, PNG or WebP · Max 5MB</p>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-ink-200 text-sm font-medium text-ink-600 hover:bg-ink-50 transition-colors">
          <Camera size={14} />
          {preview ? 'Change Image' : 'Upload Image'}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
      </div>
    </div>
  );
}
