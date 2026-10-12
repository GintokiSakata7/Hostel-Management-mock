import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Plus, Layers } from 'lucide-react';
import { useDemoData } from '../context/DemoDataContext';
import { useToast } from '../context/ToastContext';

export const WorkspaceSelector: React.FC = () => {
  const { buildings, selectedBuildingId, setSelectedBuildingId, addBuilding } = useDemoData();
  const { success } = useToast();
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingAddress, setNewBuildingAddress] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);
  const label = selectedBuildingId === 'all' ? 'All Buildings' : selectedBuilding?.name || 'Building';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim()) return;
    addBuilding(newBuildingName.trim(), newBuildingAddress.trim());
    success(`Building "${newBuildingName}" added successfully`);
    setNewBuildingName('');
    setNewBuildingAddress('');
    setShowAddModal(false);
  };

  return (
    <div className="workspace-selector-container" ref={dropdownRef}>
      <button
        className="workspace-trigger-btn"
        onClick={() => setOpen(!open)}
        title="Switch Building Portfolio"
      >
        <Building2 size={16} className="text-primary" />
        <span className="workspace-label">{label}</span>
        <ChevronDown size={14} className={`chevron-icon ${open ? 'rotate' : ''}`} />
      </button>

      {open && (
        <div className="workspace-dropdown-menu animate-scale-up">
          <div className="dropdown-header">SELECT FACILITY / BUILDING</div>

          {/* All Buildings */}
          <button
            className={`dropdown-item ${selectedBuildingId === 'all' ? 'active' : ''}`}
            onClick={() => {
              setSelectedBuildingId('all');
              setOpen(false);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#f97316" />
              <div>
                <div style={{ fontWeight: 600 }}>All Buildings (Consolidated)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Combined occupancy, dues & finances
                </div>
              </div>
            </div>
            {selectedBuildingId === 'all' && <Check size={16} color="#f97316" />}
          </button>

          <div className="dropdown-divider" />

          {/* Building List */}
          {buildings.map(b => (
            <button
              key={b.id}
              className={`dropdown-item ${selectedBuildingId === b.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedBuildingId(b.id);
                setOpen(false);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} color="#64748b" />
                <div>
                  <div style={{ fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {b.tag || b.address || `${b.floorsCount} Floors`}
                  </div>
                </div>
              </div>
              {selectedBuildingId === b.id && <Check size={16} color="#f97316" />}
            </button>
          ))}

          <div className="dropdown-divider" />

          <button
            className="dropdown-item add-building-btn"
            onClick={() => {
              setOpen(false);
              setShowAddModal(true);
            }}
          >
            <Plus size={16} />
            <span>+ Add New Wing / Hostel</span>
          </button>
        </div>
      )}

      {/* Add Building Modal */}
      {showAddModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div className="modal-card modal-sm animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Add New Building / Wing</h3>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label">BUILDING / BLOCK NAME *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. VMR Royal - Block D"
                    value={newBuildingName}
                    onChange={e => setNewBuildingName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">ADDRESS / LOCALITY</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Near Silicon Towers, Gachibowli"
                    value={newBuildingAddress}
                    onChange={e => setNewBuildingAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Building
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
