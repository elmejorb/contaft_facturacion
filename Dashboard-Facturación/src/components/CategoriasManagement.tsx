import { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { Search, RefreshCw, Plus, Pencil, Trash2, Save, X, Tag } from 'lucide-react';

ModuleRegistry.registerModules([AllCommunityModule]);

const API = 'http://localhost:80/conta-app-backend/api/inventario/categorias.php';

interface Categoria {
  Id_Categoria: number;
  Categoria: string;
  Total_Articulos: number;
}

export function CategoriasManagement() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');
  const gridRef = useRef<AgGridReact>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nuevoRef = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (d.success) setCategorias(d.categorias);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardarEdicion = async () => {
    if (!editNombre.trim()) return;
    setError('');
    try {
      const r = await fetch(API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Id_Categoria: editando, Categoria: editNombre.trim().toUpperCase() })
      });
      const d = await r.json();
      if (d.success) {
        setEditando(null);
        cargar();
      } else {
        setError(d.message);
      }
    } catch (e) {
      setError('Error al guardar');
    }
  };

  const crear = async () => {
    if (!nuevoNombre.trim()) return;
    setError('');
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Categoria: nuevoNombre.trim().toUpperCase() })
      });
      const d = await r.json();
      if (d.success) {
        setNuevoNombre('');
        setCreando(false);
        cargar();
      } else {
        setError(d.message);
      }
    } catch (e) {
      setError('Error al crear');
    }
  };

  const eliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return;
    setError('');
    try {
      const r = await fetch(`${API}?id=${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) {
        cargar();
      } else {
        setError(d.message);
      }
    } catch (e) {
      setError('Error al eliminar');
    }
  };

  const filtradas = categorias.filter(c =>
    c.Categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalArticulos = categorias.reduce((s, c) => s + c.Total_Articulos, 0);

  const columnDefs: ColDef[] = [
    {
      headerName: 'ID',
      field: 'Id_Categoria',
      width: 80,
      sortable: true,
    },
    {
      headerName: 'Categoría',
      field: 'Categoria',
      flex: 1,
      minWidth: 250,
      sortable: true,
      filter: true,
      cellRenderer: (p: any) => {
        if (editando === p.data.Id_Categoria) {
          return null; // Handled by full row renderer
        }
        return p.value;
      }
    },
    {
      headerName: 'Artículos',
      field: 'Total_Articulos',
      width: 120,
      sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) => {
        const v = p.value || 0;
        const color = v > 100 ? '#7c3aed' : v > 0 ? '#2563eb' : '#9ca3af';
        return <span style={{ color, fontWeight: 600 }}>{v.toLocaleString()}</span>;
      }
    },
    {
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
      cellRenderer: (p: any) => {
        return (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              title="Editar"
              onClick={() => {
                setEditando(p.data.Id_Categoria);
                setEditNombre(p.data.Categoria);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <Pencil size={16} color="#f59e0b" />
            </button>
            <button
              title="Eliminar"
              onClick={() => eliminar(p.data.Id_Categoria, p.data.Categoria)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <Trash2 size={16} color="#ef4444" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Categorías</h2>
        <p style={{ fontSize: 13, color: '#6b7280' }}>Administra las categorías de productos</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tag size={20} color="#7c3aed" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Total Categorías</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{categorias.length}</div>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tag size={20} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Total Artículos</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{totalArticulos.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tag size={20} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Promedio Art/Cat</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {categorias.length > 0 ? Math.round(totalArticulos / categorias.length) : 0}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '10px 16px', marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        <div style={{ position: 'relative', flex: '0 0 300px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Buscar categoría..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              width: '100%', height: 32, paddingLeft: 32, paddingRight: 10,
              border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none'
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        {creando ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={nuevoRef}
              type="text"
              placeholder="Nombre de la categoría"
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') crear(); if (e.key === 'Escape') { setCreando(false); setNuevoNombre(''); } }}
              style={{
                width: 250, height: 32, padding: '0 10px',
                border: '1px solid #7c3aed', borderRadius: 8, fontSize: 13, outline: 'none'
              }}
              autoFocus
            />
            <button
              onClick={crear}
              style={{
                height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <Save size={14} /> Guardar
            </button>
            <button
              onClick={() => { setCreando(false); setNuevoNombre(''); }}
              style={{
                height: 32, padding: '0 14px', background: '#f3f4f6', color: '#374151',
                border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <X size={14} /> Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setCreando(true); setTimeout(() => nuevoRef.current?.focus(), 100); }}
            style={{
              height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Plus size={14} /> Nueva Categoría
          </button>
        )}

        <button
          onClick={cargar}
          style={{
            height: 32, padding: '0 14px', background: '#7c3aed', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      {/* Inline edit bar */}
      {editando !== null && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 16px',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>Editando ID {editando}:</span>
          <input
            ref={inputRef}
            type="text"
            value={editNombre}
            onChange={e => setEditNombre(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') guardarEdicion(); if (e.key === 'Escape') setEditando(null); }}
            style={{
              flex: 1, height: 30, padding: '0 10px',
              border: '1px solid #f59e0b', borderRadius: 6, fontSize: 13, outline: 'none'
            }}
          />
          <button
            onClick={guardarEdicion}
            style={{
              height: 30, padding: '0 14px', background: '#f59e0b', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Save size={14} /> Guardar
          </button>
          <button
            onClick={() => setEditando(null)}
            style={{
              height: 30, padding: '0 14px', background: '#f3f4f6', color: '#374151',
              border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <X size={14} /> Cancelar
          </button>
        </div>
      )}

      {/* AG Grid */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ height: 'calc(100vh - 420px)', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={filtradas}
            columnDefs={columnDefs}
            loading={loading}
            animateRows={true}
            getRowId={p => String(p.data.Id_Categoria)}
            rowHeight={38}
            headerHeight={38}
            defaultColDef={{
              resizable: true,
            }}
            getRowStyle={(p) => {
              if (editando === p.data?.Id_Categoria) {
                return { background: '#fffbeb' };
              }
              return undefined;
            }}
          />
        </div>
      </div>
    </div>
  );
}
