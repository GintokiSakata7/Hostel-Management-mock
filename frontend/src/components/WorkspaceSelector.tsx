import React, { useState, useEffect } from 'react';
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const renderBuildingList = () => (
    <>
      <div style={{ padding: '6px 4px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
          padding: '12px 14px',
          borderRadius: '12px',
          cursor: 'pointer',
          background: selectedBuildingId === 'all' ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.03)',
          color: selectedBuildingId === 'all' ? 'var(--primary)' : '#fff',
          fontSize: '0.88rem',
          fontWeight: selectedBuildingId === 'all' ? 700 : 500,
          marginBottom: '8px',
          transition: 'background 0.15s ease',
          border: selectedBuildingId === 'all' ? '1px solid rgba(249,115,22,0.35)' : '1px solid transparent'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Globe size={18} />
          <span>All Buildings (Global View)</span>
        </div>
        {selectedBuildingId === 'all' && <Check size={18} />}
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />

      {/* Individual Buildings */}
      <div style={{ maxHeight: isMobile ? '300px' : '220px', overflowY: 'auto' }}>
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
                padding: '12px 14px',
                borderRadius: '12px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.02)',
                color: isSelected ? 'var(--primary)' : '#fff',
                fontSize: '0.88rem',
                fontWeight: isSelected ? 700 : 500,
                marginBottom: '6px',
                transition: 'background 0.15s ease',
                border: isSelected ? '1px solid rgba(249,115,22,0.35)' : '1px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <Building2 size={18} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                  {b.totalBeds !== undefined && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.totalBeds} Beds · {b.availableBeds} Free</div>
                  )}
                </div>
              </div>
              {isSelected && <Check size={18} />}
            </div>
          );
        })}
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />

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
          padding: '12px 14px',
          borderRadius: '12px',
          cursor: 'pointer',
          color: 'var(--primary)',
          fontSize: '0.88rem',
          fontWeight: 700,
          background: 'rgba(249,115,22,0.1)',
          transition: 'background 0.15s ease'
        }}
      >
        <Plus size={18} />
        <span>Add New Building</span>
      </div>
    </>
  );

  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: isMobile ? '5px' : '8px',
            padding: isMobile ? '5px 10px' : '6px 14px',
            background: 'rgba(249,115,22,0.12)',
            border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: '10px',
            color: '#fff',
            fontWeight: 700,
            fontSize: isMobile ? '0.75rem' : '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(249,115,22,0.1)',
            whiteSpace: 'nowrap'
          }}
        >
          {selectedBuildingId === 'all' ? (
            <Globe size={14} color="var(--primary)" />
          ) : (
            <Building2 size={14} color="var(--primary)" />
          )}
          <span style={{ maxWidth: isMobile ? 80 : 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeBuildingName}
          </span>
          <ChevronDown size={13} color="var(--text-muted)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
        </button>

        {/* Desktop dropdown with backdrop */}
        {!isMobile && open && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 2999 }}
              onClick={() => setOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '6px',
                width: '280px',
                background: 'rgba(18, 22, 34, 0.98)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
                padding: '10px',
                zIndex: 3000,
                animation: 'fadeIn 0.15s ease-out'
              }}
            >
              {renderBuildingList()}
            </div>
          </>
        )}
      </div>

      {/* Mobile bottom sheet modal */}
      {isMobile && open && (
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Select Workspace">
          {renderBuildingList()}
        </Modal>
      )}

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
