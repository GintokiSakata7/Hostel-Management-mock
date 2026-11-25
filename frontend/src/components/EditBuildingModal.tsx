import { useEffect, useMemo, useState } from 'react';
import { BedDouble, Check, Home, Layers3, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useToast } from './ToastContext';

interface EditBuildingModalProps {
  building: any;
  rooms: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const BED_PRESETS = [1, 2, 3, 4, 5, 6];

/** Sort floors naturally so "1", "2", "10" order numerically before named floors. */
function sortFloors(floors: string[]): string[] {
  return [...floors].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1;
    if (!isNaN(nb)) return 1;
    return a.localeCompare(b);
  });
}

/** Suggest the next likely room number for a floor (e.g. Floor 2 -> "201" or max+1). */
function suggestNextRoomNumber(floor: string, floorRooms: any[]): string {
  const numericIds = floorRooms
    .map(r => parseInt(String(r.id).replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n) && n > 0);
  if (numericIds.length > 0) {
    return String(Math.max(...numericIds) + 1);
  }
  const fNum = parseInt(floor, 10);
  return !isNaN(fNum) ? `${fNum}01` : '101';
}

export default function EditBuildingModal({
  building,
  rooms,
  onClose,
  onSuccess
}: EditBuildingModalProps) {
  const { showToast, confirmAction } = useToast();
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [buildingName, setBuildingName] = useState(building ? building.name : '');
  const [savingName, setSavingName] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  // Track locally added empty floors before their first room is saved to DB
  const [localNewFloors, setLocalNewFloors] = useState<string[]>([]);

  const existingFloors = useMemo(
    () => sortFloors(Array.from(new Set(rooms.map(r => String(r.floor))))),
    [rooms]
  );

  const floorsList = useMemo(
    () => sortFloors(Array.from(new Set([...existingFloors, ...localNewFloors]))),
    [existingFloors, localNewFloors]
  );

  const [activeFloor, setActiveFloor] = useState<string>(
    existingFloors.length > 0 ? existingFloors[0] : '1'
  );

  // Add-room form state (collapsed into a clean action button on mobile by default)
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(4);
  const [addingRoom, setAddingRoom] = useState(false);
  const [updatingRoomId, setUpdatingRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (floorsList.length > 0 && !floorsList.includes(activeFloor)) {
      setActiveFloor(floorsList[0]);
    }
    if (existingFloors.length > 0) {
      setLocalNewFloors(prev => prev.filter(f => !existingFloors.includes(f)));
    }
  }, [floorsList, existingFloors, activeFloor]);

  const floorRooms = useMemo(
    () => rooms.filter(r => String(r.floor) === String(activeFloor)),
    [rooms, activeFloor]
  );

  const totalBeds = rooms.reduce((s, r) => s + (r.capacity || 0), 0);
  const totalOccupied = rooms.reduce((s, r) => s + (r.occupied || 0), 0);
  const floorBeds = floorRooms.reduce((s, r) => s + (r.capacity || 0), 0);
  const floorOccupied = floorRooms.reduce((s, r) => s + (r.occupied || 0), 0);
  const isLocalEmptyFloor =
    localNewFloors.includes(activeFloor) && !existingFloors.includes(activeFloor);

  const openAddRoomForm = () => {
    setNewRoomNumber(suggestNextRoomNumber(activeFloor, floorRooms));
    setShowAddRoomForm(true);
  };

  const handleRenameBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!building || !buildingName.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/buildings/${building.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: buildingName.trim() })
      });
      if (res.ok) {
        showToast('Building name updated!', 'success');
        setIsRenaming(false);
        onSuccess();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to rename building', 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleAddFloor = () => {
    const maxFloor = floorsList.reduce((max, f) => {
      const n = parseInt(f, 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    const nextFloor = String(maxFloor + 1);
    if (!floorsList.includes(nextFloor)) {
      setLocalNewFloors(prev => [...prev, nextFloor]);
      setActiveFloor(nextFloor);
      setNewRoomNumber(`${nextFloor}01`);
      if (isMobile) setShowAddRoomForm(true);
      showToast(`Floor ${nextFloor} added — add its first room below.`, 'info');
    }
  };

  const handleRemoveDraftFloor = (floor: string) => {
    const remaining = floorsList.filter(f => f !== floor);
    setLocalNewFloors(prev => prev.filter(f => f !== floor));
    setActiveFloor(remaining[0] || '1');
    setShowAddRoomForm(false);
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRoomNumber.trim();
    if (!trimmed) {
      showToast('Please enter a room number', 'error');
      return;
    }
    setAddingRoom(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId: building.id,
          floor: activeFloor,
          roomNumber: trimmed,
          capacity: newRoomCapacity
        })
      });
      if (res.ok) {
        showToast(`Room ${trimmed} added to Floor ${activeFloor}!`, 'success');
        const nextSuggested = suggestNextRoomNumber(activeFloor, [
          ...floorRooms,
          { id: trimmed }
        ]);
        setNewRoomNumber(isMobile ? '' : nextSuggested);
        if (isMobile) setShowAddRoomForm(false);
        onSuccess();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add room', 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setAddingRoom(false);
    }
  };

  const handleUpdateRoomCapacity = async (room: any, newCap: number) => {
    setUpdatingRoomId(room.dbId);
    try {
      const res = await fetch(`/api/rooms/${room.dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capacity: newCap })
      });
      if (res.ok) {
        showToast(`Room ${room.id} → ${newCap} beds`, 'success');
        onSuccess();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update capacity', 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setUpdatingRoomId(null);
    }
  };

  const handleDeleteRoom = (room: any) => {
    confirmAction({
      title: 'Delete Room',
      message: `Delete Room ${room.id}? This will permanently remove the room and all its ${room.capacity} empty bed(s).`,
      confirmText: 'Delete Room',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/rooms/${room.dbId}`, { method: 'DELETE' });
          if (res.ok) {
            showToast(`Room ${room.id} deleted`, 'success');
            onSuccess();
          } else {
            const err = await res.json();
            showToast(err.error || 'Failed to delete room', 'error');
          }
        } catch (e: any) {
          showToast('Error: ' + e.message, 'error');
        }
      }
    });
  };

  return (
    <div className="edit-building-overlay" onClick={onClose}>
      <div className="edit-building-container" onClick={e => e.stopPropagation()}>
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
            <div className="bottom-sheet-handle" style={{ margin: 0 }} />
          </div>
        )}

        {/* ===== 1. Compact Header + Inline Rename ===== */}
        <div className="edit-building-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', minWidth: 0, flex: 1 }}>
            {!isMobile && (
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
                  flexShrink: 0
                }}
              >
                <Home size={20} color="#fff" />
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              {isRenaming ? (
                <form
                  onSubmit={handleRenameBuilding}
                  style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <input
                    autoFocus
                    className="custom-input"
                    value={buildingName}
                    onChange={e => setBuildingName(e.target.value)}
                    placeholder="Building name"
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      width: isMobile ? '155px' : '220px',
                      height: 36
                    }}
                  />
                  <button
                    type="submit"
                    disabled={savingName}
                    style={{
                      background: 'var(--primary)',
                      border: 'none',
                      color: '#fff',
                      height: 36,
                      padding: '0 12px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Check size={14} /> {savingName ? '…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRenaming(false);
                      setBuildingName(building.name);
                    }}
                    style={{
                      background: 'var(--surface-3)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-muted)',
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 8,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: isMobile ? '1.05rem' : '1.15rem',
                        fontWeight: 800,
                        letterSpacing: -0.3,
                        color: 'var(--text-main)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {building.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsRenaming(true)}
                      title="Rename Building"
                      style={{
                        background: 'var(--surface-3)',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-muted)',
                        padding: isMobile ? '4px 8px' : '3px 9px',
                        borderRadius: 8,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0
                      }}
                    >
                      <Pencil size={11} /> Rename
                    </button>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {floorsList.length} Floor{floorsList.length !== 1 ? 's' : ''} · {rooms.length} Room{rooms.length !== 1 ? 's' : ''} · {totalOccupied}/{totalBeds} Beds occupied
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div className="edit-building-stat-chip">
              <BedDouble size={12} />
              <span>{totalBeds - totalOccupied} Vacant</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close layout editor"
              className="icon-btn-small"
              style={{ width: 36, height: 36 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ===== 2. Body: Floor Navigation + Room Editor ===== */}
        <div className="edit-building-body">
          {/* Floor Selector: Sidebar on Desktop, Clean Horizontal Pill Strip on Mobile */}
          {isMobile ? (
            <div className="edit-building-mobile-floors">
              <div className="edit-building-mobile-floors-scroll">
                {floorsList.map(f => {
                  const fRooms = rooms.filter(r => String(r.floor) === String(f));
                  const isActive = activeFloor === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setActiveFloor(f)}
                      className={`edit-building-mobile-floor-pill ${isActive ? 'active' : ''}`}
                    >
                      <span>Floor {f}</span>
                      <span className="edit-building-mobile-floor-count">{fRooms.length}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={handleAddFloor}
                  className="edit-building-add-floor-pill"
                >
                  <Plus size={13} /> Floor
                </button>
              </div>
            </div>
          ) : (
            <div className="edit-building-floors-nav">
              <div style={{ padding: '16px 14px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--text-muted)' }}>
                  Floors
                </span>
                <button
                  type="button"
                  onClick={handleAddFloor}
                  style={{
                    background: 'rgba(249,115,22,0.14)',
                    border: '1px solid rgba(249,115,22,0.38)',
                    color: 'var(--primary)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={12} /> Floor
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 10px 12px', flex: 1, overflowY: 'auto' }}>
                {floorsList.map(f => {
                  const fRooms = rooms.filter(r => String(r.floor) === String(f));
                  const fBeds = fRooms.reduce((s, r) => s + r.capacity, 0);
                  const fOcc = fRooms.reduce((s, r) => s + r.occupied, 0);
                  const isActive = activeFloor === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setActiveFloor(f)}
                      className={`edit-building-floor-tab ${isActive ? 'active' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            background: isActive ? 'rgba(249,115,22,0.18)' : 'var(--surface-3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${isActive ? 'rgba(249,115,22,0.4)' : 'var(--border-dim)'}`
                          }}
                        >
                          <Layers3 size={14} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isActive ? 'var(--primary)' : 'var(--text-main)' }}>
                            Floor {f}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
                            {fRooms.length} room{fRooms.length !== 1 ? 's' : ''} · {fOcc}/{fBeds} beds
                          </div>
                        </div>
                      </div>
                      {fOcc > 0 && (
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: fOcc === fBeds ? 'var(--danger)' : 'var(--success)',
                            flexShrink: 0
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right / Main: Floor Rooms Panel */}
          <div className="edit-building-rooms-panel">
            {/* Compact Floor Sub-bar */}
            <div className="edit-building-floor-subheader">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: isMobile ? '0.9rem' : '1rem', color: 'var(--text-main)' }}>
                  Floor {activeFloor}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {floorRooms.length} room{floorRooms.length !== 1 ? 's' : ''} · {floorOccupied}/{floorBeds} beds used
                </span>
              </div>
              {isLocalEmptyFloor && (
                <button
                  type="button"
                  onClick={() => handleRemoveDraftFloor(activeFloor)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(239,68,68,0.35)',
                    color: 'var(--danger)',
                    padding: '3px 9px',
                    borderRadius: 8,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Remove Empty Floor
                </button>
              )}
            </div>

            {/* Scrollable Rooms Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 14px' : '16px 22px', WebkitOverflowScrolling: 'touch' }}>
              {floorRooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: isMobile ? '2rem 1rem' : '3rem 2rem', color: 'var(--text-muted)' }}>
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 16,
                      margin: '0 auto 12px',
                      background: 'var(--surface-3)',
                      border: '1px dashed var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Home size={22} color="var(--text-muted)" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: 'var(--text-main)' }}>
                    No rooms on Floor {activeFloor} yet
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: isMobile ? 14 : 0 }}>
                    Add rooms to start assigning students to beds.
                  </div>
                  {isMobile && !showAddRoomForm && (
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={openAddRoomForm}
                      style={{ padding: '10px 18px', fontSize: '0.85rem', borderRadius: 12 }}
                    >
                      <Plus size={16} /> Add Room to Floor {activeFloor}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {isMobile && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                      Tap <strong style={{ color: 'var(--text-main)' }}>− / +</strong> to change beds in a room. Empty rooms can be deleted.
                    </div>
                  )}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))',
                      gap: isMobile ? '8px' : '12px'
                    }}
                  >
                    {floorRooms.map(room => {
                      const isEmpty = room.occupied === 0;
                      const isFull = room.occupied >= room.capacity;
                      const statusColor = isEmpty ? 'var(--success)' : isFull ? 'var(--danger)' : 'var(--warning)';
                      const isUpdating = updatingRoomId === room.dbId;

                      return (
                        <div key={room.dbId} className="edit-building-room-card">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            {/* Room Identity + Occupancy */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <span
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  background: statusColor,
                                  flexShrink: 0
                                }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                  Room {room.id}
                                </div>
                                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                  {isEmpty ? 'Empty · Safe to delete' : `${room.occupied} of ${room.capacity} occupied`}
                                </div>
                              </div>
                            </div>

                            {/* Bed Stepper + Delete */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: 'var(--surface-input)',
                                  border: '1px solid var(--border-light)',
                                  borderRadius: 10,
                                  padding: '3px 4px'
                                }}
                              >
                                <button
                                  type="button"
                                  disabled={isUpdating || room.capacity <= 1 || room.capacity <= room.occupied}
                                  onClick={() => handleUpdateRoomCapacity(room, room.capacity - 1)}
                                  aria-label={`Decrease beds in Room ${room.id}`}
                                  className="edit-building-cap-btn"
                                  style={{
                                    opacity: isUpdating || room.capacity <= 1 || room.capacity <= room.occupied ? 0.28 : 1
                                  }}
                                >
                                  −
                                </button>
                                <span
                                  style={{
                                    fontWeight: 800,
                                    fontSize: '0.84rem',
                                    color: 'var(--text-main)',
                                    minWidth: 38,
                                    textAlign: 'center'
                                  }}
                                >
                                  {room.capacity} {room.capacity === 1 ? 'bed' : 'beds'}
                                </span>
                                <button
                                  type="button"
                                  disabled={isUpdating || room.capacity >= 12}
                                  onClick={() => handleUpdateRoomCapacity(room, room.capacity + 1)}
                                  aria-label={`Increase beds in Room ${room.id}`}
                                  className="edit-building-cap-btn"
                                  style={{ opacity: isUpdating || room.capacity >= 12 ? 0.28 : 1 }}
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                disabled={!isEmpty}
                                onClick={() => handleDeleteRoom(room)}
                                title={isEmpty ? 'Delete Room' : 'Empty the room first to delete'}
                                aria-label={`Delete Room ${room.id}`}
                                className="icon-btn-small delete"
                                style={{
                                  width: 32,
                                  height: 32,
                                  opacity: isEmpty ? 1 : 0.28,
                                  cursor: isEmpty ? 'pointer' : 'not-allowed'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ===== 3. Bottom Add Room Area (Single CTA on Mobile -> Expands Clean Card; Compact Bar on Desktop) ===== */}
            <div className="edit-building-add-room-bar">
              {isMobile && !showAddRoomForm ? (
                <button
                  type="button"
                  onClick={openAddRoomForm}
                  className="primary-btn"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.9rem', borderRadius: 12 }}
                >
                  <Plus size={17} /> Add New Room to Floor {activeFloor}
                </button>
              ) : (
                <form
                  onSubmit={handleAddRoom}
                  style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 12, width: '100%', alignItems: isMobile ? 'stretch' : 'center' }}
                >
                  {isMobile && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        New Room on Floor {activeFloor}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddRoomForm(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                    <input
                      required
                      autoFocus={isMobile}
                      className="custom-input"
                      value={newRoomNumber}
                      onChange={e => setNewRoomNumber(e.target.value)}
                      placeholder={`Room No. (e.g. ${suggestNextRoomNumber(activeFloor, floorRooms)})`}
                      style={{
                        padding: '10px 12px',
                        fontSize: '0.88rem',
                        flex: isMobile ? '1 1 100%' : '1 1 160px',
                        minWidth: 130
                      }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: 2 }}>
                        Beds:
                      </span>
                      {BED_PRESETS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewRoomCapacity(c)}
                          className={`edit-building-cap-chip ${newRoomCapacity === c ? 'active' : ''}`}
                        >
                          {c}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setNewRoomCapacity(8)}
                        className={`edit-building-cap-chip ${newRoomCapacity === 8 ? 'active' : ''}`}
                      >
                        8
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="primary-btn"
                    style={{
                      padding: isMobile ? '11px 16px' : '10px 18px',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap',
                      borderRadius: 10,
                      justifyContent: 'center'
                    }}
                    disabled={addingRoom}
                  >
                    <Plus size={15} /> {addingRoom ? 'Adding…' : 'Add Room'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
