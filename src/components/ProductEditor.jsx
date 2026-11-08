'use client';
import { ArrowRight, X } from 'lucide-react';
import ProductThumb from './ProductThumb';

export default function ProductEditor({ form, setForm, categories, imageOptions = [], editing, busy, error, onClose, onSubmit }) {
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal inventory-modal" role="dialog" aria-modal="true" aria-label={editing ? 'Editar producto' : 'Agregar producto'}>
      <div className="modal-head"><div><span className="eyebrow">INVENTARIO / PRODUCTO</span><h2>{editing ? 'Editar producto' : 'Agregar producto'}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar"><X size={20}/></button></div>
      <form className="product-form" onSubmit={onSubmit}>
        <fieldset><legend>Información general</legend>
          <label>Nombre del producto *<input value={form.name} onChange={event => set('name', event.target.value)} minLength={2} maxLength={80} required autoFocus/></label>
          <div className="form-grid"><label>Código de barras<input value={form.barcode} onChange={event => set('barcode', event.target.value)} maxLength={32} placeholder="Opcional"/></label><label>Categoría *<select value={form.categoryId} onChange={event => set('categoryId', event.target.value)} required><option value="">Seleccioná una categoría</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>
          <label>Descripción<textarea value={form.description} onChange={event => set('description', event.target.value)} maxLength={500} rows={2} placeholder="Opcional"/></label>
          <label>Imagen local<select value={form.imageUrl} onChange={event => set('imageUrl', event.target.value)}><option value="">Sin imagen</option>{imageOptions.map(product => <option key={product.imageUrl} value={product.imageUrl}>{product.name}</option>)}</select></label>
          {form.imageUrl && <div className="image-choice"><ProductThumb product={{ name: form.name || 'Producto', imageUrl: form.imageUrl }}/><span>Imagen incluida en la aplicación. La carga de archivos estará disponible cuando se configure almacenamiento.</span></div>}
        </fieldset>
        <fieldset><legend>Precios</legend><div className="form-grid"><label>Precio de venta ($) *<input type="number" min="0.01" max="100000000" step="0.01" value={form.salePrice} onChange={event => set('salePrice', event.target.value)} required/></label><label>Precio de compra ($)<input type="number" min="0" max="100000000" step="0.01" value={form.costPrice} onChange={event => set('costPrice', event.target.value)} placeholder="Opcional"/></label></div></fieldset>
        <fieldset><legend>Inventario</legend><div className="form-grid">{!editing && <label>Stock inicial *<input type="number" min="0" max="1000000" step="1" value={form.stock} onChange={event => set('stock', event.target.value)} required/></label>}<label>Stock mínimo *<input type="number" min="0" max="1000000" step="1" value={form.minStock} onChange={event => set('minStock', event.target.value)} required/></label></div><label>Unidad de medida<select value={form.unit} onChange={event => set('unit', event.target.value)}><option value="unidad">Unidad</option><option value="kilogramo">Kilogramo</option><option value="litro">Litro</option></select></label>{editing && <p className="form-help">Para modificar la cantidad, usá Ajustar stock desde la tabla. El cambio quedará registrado con su motivo.</p>}</fieldset>
        {error && <div className="alert-error" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="button-primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar producto'} <ArrowRight size={16}/></button></div>
      </form>
    </div>
  </div>;
}
