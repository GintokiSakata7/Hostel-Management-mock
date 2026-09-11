import React, { useState } from 'react';
import { Building2, ChevronDown, Check, Plus, Globe } from 'lucide-react';
import { useBuilding } from './BuildingContext';
import { useToast } from './ToastContext';
import Modal from './Modal';

export default function WorkspaceSelector() {
  const { selectedBuildingId, setSelectedBuildingId, buildings, activeBuildingName, fetchBuildings } = useBuilding();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBuildingName.trim() })
      });
      if (res.ok) {
        showToast('New building workspace added successfully!', 'success');
        await fetchBuildings();
        setShowAddModal(false);
        setNewBuildingName('');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add building', 'error');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            background: 'rgba(249,115,22,0.12)',
            border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: '12px',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(249,115,22,0.1)'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(249,115,22,0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(249,115,22,0.12)'}
        >
          {selectedBuildingId === 'all' ? (
            <Globe size={15} color="var(--primary)" />
          ) : (
            <Building2 size={15} color="var(--primary)" />
          )}
          <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeBuildingName}
          </span>
          <ChevronDown size={14} color="var(--text-muted)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {open && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '6px',
              width: '260px',
              background: 'rgba(20, 24, 36, 0.96)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
              padding: '6px',
              zIndex: 3000,
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            <div style={{ padding: '6px 10px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Switch Building Workspace
            </div>

            {/* All Buildings Option */}
            <div
              onClick={() => {
                setSelectedBuildingId('all');
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                background: selectedBuildingId === 'all' ? 'rgba(249,115,22,0.18)' : 'transparent',
                color: selectedBuildingId === 'all' ? 'var(--primary)' : '#fff',
                fontSize: '0.85rem',
                fontWeight: selectedBuildingId === 'all' ? 700 : 500,
                marginBottom: '4px',
                transition: 'background 0.15s ease'
              }}
              onMouseOver={e => {
                if (selectedBuildingId !== 'all') e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseOut={e => {
                if (selectedBuildingId !== 'all') e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Globe size={16} />
                <span>All Buildings (Global View)</span>
              </div>
              {selectedBuildingId === 'all' && <Check size={16} />}
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

            {/* Individual Buildings */}
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {buildings.map(b => {
                const isSelected = selectedBuildingId === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedBuildingId(b.id);
                      setOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(249,115,22,0.18)' : 'transparent',
                      color: isSelected ? 'var(--primary)' : '#fff',
                      fontSize: '0.84rem',
                      fontWeight: isSelected ? 700 : 500,
                      marginBottom: '2px',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseOver={e => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseOut={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <Building2 size={16} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                        {b.totalBeds !== undefined && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{b.totalBeds} Beds · {b.availableBeds} Free</div>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check size={16} />}
                  </div>
                );
              })}
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

            {/* Add Building Option */}
            <div
              onClick={() => {
                setOpen(false);
                setShowAddModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                color: 'var(--primary)',
                fontSize: '0.82rem',
                fontWeight: 700,
                transition: 'background 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(249,115,22,0.12)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <Plus size={16} />
              <span>Add New Building</span>
            </div>
          </div>
        )}
      </div>

      {/* Add New Building Modal */}
      {showAddModal && (
        <Modal isOpen onClose={() => setShowAddModal(false)} title="Add New Hostel Building">
          <form onSubmit={handleAddBuilding}>
            <div className="form-group">
              <label>Building / Hostel Name</label>
              <input
                required
                className="custom-input"
                value={newBuildingName}
                onChange={e => setNewBuildingName(e.target.value)}
                placeholder="e.g. Building C - Executive Hostel"
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" className="custom-select" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
                {saving ? 'Adding…' : '✓ Add Building Workspace'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
