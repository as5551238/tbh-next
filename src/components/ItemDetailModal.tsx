/**
 * ItemDetailModal — A generic detail/edit modal for list items.
 *
 * Renders key-value pairs from any data object with inline editing.
 * Supports: text, textarea, select, number, date input types.
 */
import { type ReactNode } from 'react';
import { Modal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date';
  options?: { value: string; label: string }[];
  editable?: boolean; // default true
}

interface Props<T extends Record<string, unknown> = Record<string, unknown>> {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FieldDef[];
  data: T | null;
  onSave: (updated: T) => void;
  onDelete?: () => void;
  extraFooter?: ReactNode;
}

export default function ItemDetailModal<T extends Record<string, unknown> = Record<string, unknown>>({ open, onClose, title, fields, data, onSave, onDelete, extraFooter }: Props<T>) {
  if (!data) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const updated: Record<string, unknown> = { ...data };
    for (const field of fields) {
      if (field.editable === false) continue;
      let val: string | number = fd.get(field.key) as string;
      if (field.type === 'number') val = Number(val);
      updated[field.key] = val;
    }
    onSave(updated as T);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-lg"
      footer={
        <>
          {extraFooter}
          {onDelete && (
            <button type="button" onClick={() => { onDelete(); onClose(); }}
              className="mr-auto rounded-lg bg-danger/10 px-4 py-2 text-xs font-semibold text-danger hover:bg-danger/20 transition-colors">
              删除
            </button>
          )}
          <button onClick={onClose} className={btnSecondary}>取消</button>
          <button type="submit" form="item-detail-form" className={btnPrimary}>保存</button>
        </>
      }>
      <form id="item-detail-form" onSubmit={handleSubmit} className="space-y-0">
        {fields.map((f) => {
          const val = data[f.key] ?? '';
          if (f.editable === false) {
            return (
              <ModalField key={f.key} label={f.label}>
                <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text-3">{String(val)}</div>
              </ModalField>
            );
          }
          if (f.type === 'textarea') {
            return (
              <ModalField key={f.key} label={f.label}>
                <textarea name={f.key} defaultValue={String(val)} rows={3} className={inputCls + ' min-h-[60px]'} />
              </ModalField>
            );
          }
          if (f.type === 'select') {
            return (
              <ModalField key={f.key} label={f.label}>
                <select name={f.key} defaultValue={String(val)} className={inputCls}>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </ModalField>
            );
          }
          if (f.type === 'number') {
            return (
              <ModalField key={f.key} label={f.label}>
                <input type="number" name={f.key} defaultValue={Number(val) || 0} className={inputCls} />
              </ModalField>
            );
          }
          if (f.type === 'date') {
            return (
              <ModalField key={f.key} label={f.label}>
                <input type="date" name={f.key} defaultValue={String(val).slice(0, 10)} className={inputCls} />
              </ModalField>
            );
          }
          return (
            <ModalField key={f.key} label={f.label}>
              <input type="text" name={f.key} defaultValue={String(val)} className={inputCls} />
            </ModalField>
          );
        })}
      </form>
    </Modal>
  );
}
