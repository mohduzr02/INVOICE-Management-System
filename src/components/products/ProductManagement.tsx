import React, { useState } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { Product, GST_RATES, GST_COMMON_UNITS } from '../../types';
import { formatINR } from '../../services/gstEngine';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

export const ProductManagement: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useBusiness();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'goods' | 'services'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hsnSac: '',
    type: 'goods' as 'goods' | 'services',
    unit: 'NOS',
    purchasePrice: 0,
    sellingPrice: 0,
    taxRate: 18,
    isTaxInclusive: false,
    cessRate: 0,
    openingStock: 0,
    currentStock: 0,
    minStockAlert: 5,
  });

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.hsnSac.includes(searchTerm) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      hsnSac: '',
      type: 'goods',
      unit: 'NOS',
      purchasePrice: 0,
      sellingPrice: 0,
      taxRate: 18,
      isTaxInclusive: false,
      cessRate: 0,
      openingStock: 0,
      currentStock: 0,
      minStockAlert: 5,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      description: prod.description || '',
      hsnSac: prod.hsnSac,
      type: prod.type,
      unit: prod.unit,
      purchasePrice: prod.purchasePrice,
      sellingPrice: prod.sellingPrice,
      taxRate: prod.taxRate,
      isTaxInclusive: prod.isTaxInclusive,
      cessRate: prod.cessRate || 0,
      openingStock: prod.openingStock,
      currentStock: prod.currentStock,
      minStockAlert: prod.minStockAlert,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      await updateProduct(editingProduct.id, {
        name: formData.name,
        description: formData.description,
        hsnSac: formData.hsnSac,
        type: formData.type,
        unit: formData.unit,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        taxRate: Number(formData.taxRate),
        isTaxInclusive: formData.isTaxInclusive,
        cessRate: Number(formData.cessRate) || 0,
        currentStock: Number(formData.currentStock),
        minStockAlert: Number(formData.minStockAlert),
      });
    } else {
      await addProduct({
        name: formData.name,
        description: formData.description,
        hsnSac: formData.hsnSac,
        type: formData.type,
        unit: formData.unit,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        taxRate: Number(formData.taxRate),
        isTaxInclusive: formData.isTaxInclusive,
        cessRate: Number(formData.cessRate) || 0,
        openingStock: Number(formData.openingStock),
        currentStock: Number(formData.currentStock || formData.openingStock),
        minStockAlert: Number(formData.minStockAlert),
      });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <span>Products, Services & Inventory</span>
          </h2>
          <p className="text-xs text-slate-500">
            Catalog of items with HSN/SAC codes, GST slab rates, and reorder levels
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product / Service</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, HSN/SAC code..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Items</option>
            <option value="goods">Goods Only</option>
            <option value="services">Services Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3">HSN / SAC</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Selling Price</th>
                <th className="py-2.5 px-3 text-right">Purchase Price</th>
                <th className="py-2.5 px-3 text-center">GST Slab</th>
                <th className="py-2.5 px-3 text-center">Current Stock</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 text-xs">No items in catalog</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Your inventory is completely clean. Click "+ Add Item" to register your first product or service.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLowStock = p.type === 'goods' && p.currentStock <= p.minStockAlert;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        {p.description && (
                          <p className="text-[11px] text-slate-500 truncate max-w-[260px]">{p.description}</p>
                        )}
                      </td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-700">{p.hsnSac}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                          p.type === 'goods'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(p.sellingPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatINR(p.purchasePrice)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                        {p.taxRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {p.type === 'goods' ? (
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className={`font-mono font-bold ${
                              isLowStock ? 'text-rose-600' : 'text-slate-800'
                            }`}
                          >
                            {p.currentStock} {p.unit}
                          </span>
                          {isLowStock && (
                            <span title="Low stock warning">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-italic">N/A (Service)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete product ${p.name}?`)) {
                              deleteProduct(p.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingProduct ? 'Edit Product / Service' : 'Add New Item'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Wireless Barcode Scanner / Annual Maintenance"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional item specs or warranty info"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HSN / SAC Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={formData.hsnSac}
                    onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
                    placeholder="84713010"
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Classification</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="goods">Goods</option>
                    <option value="services">Services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UQC / Unit (Type or Pick)</label>
                  <input
                    type="text"
                    list="product-gst-units"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value.toUpperCase() })}
                    placeholder="e.g. PCS, KGS, MTR"
                    className="w-full text-xs font-mono uppercase border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={formData.sellingPrice === 0 ? '' : formData.sellingPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, sellingPrice: val === '' ? 0 : parseFloat(val) || 0 });
                    }}
                    placeholder="0.00"
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.purchasePrice === 0 ? '' : formData.purchasePrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, purchasePrice: val === '' ? 0 : parseFloat(val) || 0 });
                    }}
                    placeholder="0.00"
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Tax Slab *</label>
                  <select
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}% GST Rate
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Compensation Cess (%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.cessRate === 0 ? '' : formData.cessRate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, cessRate: val === '' ? 0 : parseFloat(val) || 0 });
                    }}
                    placeholder="0"
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {formData.type === 'goods' && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Current Stock Qty</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.currentStock === 0 ? '' : formData.currentStock}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, currentStock: val === '' ? 0 : parseFloat(val) || 0 });
                      }}
                      placeholder="0"
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Min Reorder Alert</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.minStockAlert === 0 ? '' : formData.minStockAlert}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, minStockAlert: val === '' ? 0 : parseFloat(val) || 0 });
                      }}
                      placeholder="0"
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingProduct ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* UQC Unit Autocomplete Datalist */}
      <datalist id="product-gst-units">
        {GST_COMMON_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </datalist>
    </div>
  );
};
