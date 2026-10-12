import React, { useState } from 'react';
import {
  BedDouble, Plus, Wind, CheckCircle2, User,
  Layers, ArrowRightLeft, UserMinus, MessageSquare,
  CreditCard, X, Shield, Building2
} from 'lucide-react';
import { useDemoData } from '../context/DemoDataContext';
import { useToast } from '../context/ToastContext';
import { Room, Bed, Student } from '../types';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { ConfirmModal } from '../components/ConfirmModal';

export const Rooms: React.FC = () => {
  const {
    rooms,
    students,
    buildings,
    selectedBuildingId,
    activeBuildingName,
    selectedMonth,
    addRoom,
    deleteRoom,
    allocateBed,
    deallocateBed,
    transferBed,
  } = useDemoData();

  const { success } = useToast();

  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);

  // Interaction modals
  const [activeBedModal, setActiveBedModal] = useState<{ room: Room; bed: Bed; student?: Student } | null>(null);
  const [allocateStudentId, setAllocateStudentId] = useState<string>('');
  const [transferTargetBedId, setTransferTargetBedId] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [selectedStudentForWA, setSelectedStudentForWA] = useState<Student | null>(null);
  const [deallocateConfirmBed, setDeallocateConfirmBed] = useState<Bed | null>(null);

  // New Room Form state
  const [newRoomData, setNewRoomData] = useState({
    roomNumber: '',
    floor: 'Ground',
    buildingId: selectedBuildingId !== 'all' ? selectedBuildingId : (buildings[0]?.id || 'bld-1'),
    sharingType: '2-Sharing' as '1-Sharing' | '2-Sharing' | '3-Sharing' | '4-Sharing',
    monthlyRent: 8500,
    hasAC: true,
    hasAttachedWashroom: true,
    bedCount: 2,
  });

  // Filter rooms by building
  const filteredRooms = selectedBuildingId === 'all'
    ? rooms
    : rooms.filter(r => r.buildingId === selectedBuildingId);

  // Extract distinct floors
  const floors = Array.from(new Set(filteredRooms.map(r => r.floor)));

  const displayedRooms = selectedFloor === 'all'
    ? filteredRooms
    : filteredRooms.filter(r => r.floor === selectedFloor);

  // Calculations
  const totalRooms = filteredRooms.length;
  const totalBeds = filteredRooms.reduce((acc, r) => acc + r.beds.length, 0);
  const occupiedBeds = filteredRooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'occupied').length, 0);
  const availableBeds = totalBeds - occupiedBeds;
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Unallocated active students for allocation
  const unallocatedStudents = students.filter(s => s.status === 'Active' && !s.bedId);

  // Available beds for transfer
  const allAvailableBeds: { room: Room; bed: Bed }[] = [];
  rooms.forEach(r => {
    r.beds.forEach(b => {
      if (b.status === 'available') {
        allAvailableBeds.push({ room: r, bed: b });
      }
    });
  });

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomData.roomNumber.trim()) return;

    addRoom({
      roomNumber: newRoomData.roomNumber.trim(),
      floor: newRoomData.floor,
      buildingId: newRoomData.buildingId,
      sharingType: newRoomData.sharingType,
      monthlyRent: newRoomData.monthlyRent,
      hasAC: newRoomData.hasAC,
      hasAttachedWashroom: newRoomData.hasAttachedWashroom,
    }, newRoomData.bedCount);

    success(`Room ${newRoomData.roomNumber} created with ${newRoomData.bedCount} beds!`);
    setShowAddRoomModal(false);
    setNewRoomData({
      ...newRoomData,
      roomNumber: '',
    });
  };

  const handleAllocateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBedModal || !allocateStudentId) return;

    allocateBed(allocateStudentId, activeBedModal.bed.id);
    const st = students.find(s => s.id === allocateStudentId);
    success(`Bed ${activeBedModal.bed.bedNumber} allocated to ${st?.name}!`);
    setActiveBedModal(null);
    setAllocateStudentId('');
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBedModal?.student || !transferTargetBedId) return;

    transferBed(activeBedModal.student.id, transferTargetBedId);
    success(`${activeBedModal.student.name} successfully transferred to new bed!`);
    setActiveBedModal(null);
    setIsTransferring(false);
    setTransferTargetBedId('');
  };

  const handleDeallocateConfirm = () => {
    if (!deallocateConfirmBed) return;
    deallocateBed(deallocateConfirmBed.id);
    success('Bed deallocated and freed successfully');
    setDeallocateConfirmBed(null);
    setActiveBedModal(null);
  };

  return (
    <div className="animate-fade-in rooms-page">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Interactive Visual Floor Plan</h1>
          <p className="page-subtitle">
            Facility: <strong>{activeBuildingName}</strong> · Real-time room vacancy map and bed allotments.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddRoomModal(true)}>
          <Plus size={16} />
          <span>+ Add New Room</span>
        </button>
      </div>

      {/* Top Floor Summary Stats */}
      <div className="responsive-grid-4 mb-6">
        <div className="glass-card stat-card">
          <div className="stat-card-title">TOTAL ROOMS</div>
          <div className="stat-card-value text-indigo">{totalRooms} Rooms</div>
          <div className="stat-card-footer text-muted">{floors.length} Floor wings</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-title">CAPACITY & BEDS</div>
          <div className="stat-card-value text-emerald">{totalBeds} Beds</div>
          <div className="stat-card-footer text-muted">{occupiedBeds} currently allocated</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-title">AVAILABLE BEDS</div>
          <div className="stat-card-value text-amber">{availableBeds} Vacant</div>
          <div className="stat-card-footer text-muted">Ready for immediate check-in</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-title">OCCUPANCY RATE</div>
          <div className="stat-card-value text-cyan">{occupancyPct}%</div>
          <div className="stat-card-footer">
            <span className="badge badge-success">{occupancyPct >= 80 ? 'High Demand' : 'Optimal'}</span>
          </div>
        </div>
      </div>

      {/* Floor Filter Tabs */}
      <div className="glass-card p-4 mb-6 floor-filter-tabs">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`floor-tab-btn ${selectedFloor === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFloor('all')}
          >
            <Layers size={14} /> All Floors ({filteredRooms.length})
          </button>
          {floors.map(fl => {
            const count = filteredRooms.filter(r => r.floor === fl).length;
            return (
              <button
                key={fl}
                className={`floor-tab-btn ${selectedFloor === fl ? 'active' : ''}`}
                onClick={() => setSelectedFloor(fl)}
              >
                {fl} ({count})
              </button>
            );
          })}
        </div>

        <div className="floor-legend">
          <div className="legend-item">
            <span className="legend-dot dot-available" />
            <span>Available Bed (Click to Allocate)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-occupied" />
            <span>Occupied (Click for Details / WA)</span>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="rooms-grid">
        {displayedRooms.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted">
            No rooms found on this floor. Click "+ Add New Room" to set up rooms.
          </div>
        ) : (
          displayedRooms.map(room => {
            const building = buildings.find(b => b.id === room.buildingId);
            const occupiedCount = room.beds.filter(b => b.status === 'occupied').length;
            const isFull = occupiedCount === room.beds.length;

            return (
              <div key={room.id} className="glass-card room-card animate-scale-up">
                {/* Room Header */}
                <div className="room-card-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="room-number">Room {room.roomNumber}</span>
                      {room.hasAC && (
                        <span className="badge-ac" title="Air Conditioned">
                          <Wind size={12} /> AC
                        </span>
                      )}
                    </div>
                    <div className="room-meta-sub">
                      {room.floor} • {building?.name || 'Main Wing'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="room-rent">₹{room.monthlyRent.toLocaleString('en-IN')}<small>/mo</small></div>
                    <span className={`badge ${isFull ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.68rem' }}>
                      {occupiedCount}/{room.beds.length} {isFull ? 'Full' : 'Vacant'}
                    </span>
                  </div>
                </div>

                {/* Bed Chips List */}
                <div className="room-beds-container">
                  {room.beds.map(bed => {
                    const student = students.find(s => s.bedId === bed.id);
                    const isOccupied = bed.status === 'occupied' && Boolean(student);

                    return (
                      <div
                        key={bed.id}
                        className={`bed-chip ${isOccupied ? 'bed-occupied' : 'bed-available'}`}
                        onClick={() => setActiveBedModal({ room, bed, student })}
                        title={isOccupied ? `Bed ${bed.bedNumber}: ${student?.name} (Click for resident menu)` : `Bed ${bed.bedNumber}: Available (Click to allocate)`}
                      >
                        <div className="bed-chip-left">
                          <div className="bed-number-circle">
                            {bed.bedNumber}
                          </div>
                          {isOccupied ? (
                            <div className="bed-occupant-info">
                              <span className="bed-occupant-name">{student?.name}</span>
                              <span className="bed-occupant-fee">
                                {student?.feeStatus === 'Paid' ? (
                                  <span style={{ color: '#22c55e' }}>✓ Paid</span>
                                ) : (
                                  <span style={{ color: '#f59e0b' }}>Pending</span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="bed-vacant-label">Available Bed</span>
                          )}
                        </div>

                        <div className="bed-chip-right">
                          {isOccupied ? (
                            <img
                              src={student?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                              alt=""
                              className="bed-avatar"
                            />
                          ) : (
                            <Plus size={14} className="text-emerald" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===================== BED CLICK DETAILS & ACTIONS MODAL ===================== */}
      {activeBedModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setActiveBedModal(null)}>
          <div className="modal-card modal-md animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="icon-badge badge-primary-glow">
                  <BedDouble size={20} color="#f97316" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                    Room {activeBedModal.room.roomNumber} · Bed {activeBedModal.bed.bedNumber}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {activeBedModal.room.floor} • {activeBedModal.room.sharingType} • ₹{activeBedModal.room.monthlyRent.toLocaleString('en-IN')}/month
                  </p>
                </div>
              </div>
              <button className="btn-close" onClick={() => { setActiveBedModal(null); setIsTransferring(false); }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* IF BED IS OCCUPIED */}
              {activeBedModal.student ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <img
                      src={activeBedModal.student.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt=""
                      className="avatar-lg"
                    />
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '1.1rem', fontWeight: 700 }}>
                        {activeBedModal.student.name}
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {activeBedModal.student.course} • {activeBedModal.student.branch}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span className={`badge ${activeBedModal.student.feeStatus === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                          {selectedMonth}: {activeBedModal.student.feeStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transfer Section */}
                  {isTransferring ? (
                    <form onSubmit={handleTransferSubmit} style={{ marginTop: '16px' }}>
                      <label className="form-label">SELECT DESTINATION VACANT BED</label>
                      <select
                        className="form-input mb-3"
                        required
                        value={transferTargetBedId}
                        onChange={e => setTransferTargetBedId(e.target.value)}
                      >
                        <option value="">Choose Bed...</option>
                        {allAvailableBeds.map(({ room: rm, bed: b }) => (
                          <option key={b.id} value={b.id}>
                            Room {rm.roomNumber} - Bed {b.bedNumber} ({rm.floor} • {rm.sharingType} • ₹{rm.monthlyRent}/mo)
                          </option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn btn-primary flex-1">
                          Confirm Transfer
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => setIsTransferring(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="bed-actions-grid">
                      {/* Send WhatsApp Reminder */}
                      <button
                        className="btn btn-whatsapp"
                        onClick={() => {
                          setSelectedStudentForWA(activeBedModal.student!);
                          setActiveBedModal(null);
                        }}
                      >
                        <MessageSquare size={16} /> Send WhatsApp Reminder
                      </button>

                      {/* Transfer Bed */}
                      <button
                        className="btn btn-outline"
                        onClick={() => setIsTransferring(true)}
                      >
                        <ArrowRightLeft size={16} /> Transfer to Another Bed
                      </button>

                      {/* Deallocate Bed */}
                      <button
                        className="btn btn-outline text-danger"
                        onClick={() => setDeallocateConfirmBed(activeBedModal.bed)}
                      >
                        <UserMinus size={16} /> Deallocate / Free Bed
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* IF BED IS AVAILABLE -> SHOW ALLOCATE FORM */
                <div>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    This bed is currently available. Select an admitted resident from the list to assign this bed.
                  </p>

                  <form onSubmit={handleAllocateSubmit}>
                    <label className="form-label">SELECT STUDENT TO ASSIGN *</label>
                    <select
                      className="form-input mb-4"
                      required
                      value={allocateStudentId}
                      onChange={e => setAllocateStudentId(e.target.value)}
                    >
                      <option value="">Choose Student...</option>
                      {unallocatedStudents.length === 0 ? (
                        <option disabled>No unallocated students available (Enroll a student first)</option>
                      ) : (
                        unallocatedStudents.map(st => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.course} • {st.phone})
                          </option>
                        ))
                      )}
                    </select>

                    <div className="modal-footer" style={{ padding: 0 }}>
                      <button type="button" className="btn btn-outline" onClick={() => setActiveBedModal(null)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={!allocateStudentId}>
                        Assign Bed
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== ADD NEW ROOM MODAL ===================== */}
      {showAddRoomModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowAddRoomModal(false)}>
          <div className="modal-card modal-md animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Add New Hostel Room</h3>
              <button className="btn-close" onClick={() => setShowAddRoomModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateRoom}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-grid-2">
                  <div>
                    <label className="form-label">ROOM NUMBER / CODE *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. 304 or B-205"
                      value={newRoomData.roomNumber}
                      onChange={e => setNewRoomData({ ...newRoomData, roomNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">FLOOR WING</label>
                    <select
                      className="form-input"
                      value={newRoomData.floor}
                      onChange={e => setNewRoomData({ ...newRoomData, floor: e.target.value })}
                    >
                      <option value="Ground">Ground Floor</option>
                      <option value="1st Floor">1st Floor</option>
                      <option value="2nd Floor">2nd Floor</option>
                      <option value="3rd Floor">3rd Floor</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div>
                    <label className="form-label">SHARING TYPE</label>
                    <select
                      className="form-input"
                      value={newRoomData.sharingType}
                      onChange={e => {
                        const val = e.target.value as any;
                        const beds = val === '1-Sharing' ? 1 : val === '2-Sharing' ? 2 : val === '3-Sharing' ? 3 : 4;
                        setNewRoomData({ ...newRoomData, sharingType: val, bedCount: beds });
                      }}
                    >
                      <option value="1-Sharing">1-Sharing (Single Suite)</option>
                      <option value="2-Sharing">2-Sharing (Double)</option>
                      <option value="3-Sharing">3-Sharing (Triple)</option>
                      <option value="4-Sharing">4-Sharing (Quad)</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">MONTHLY RENT (INR) *</label>
                    <input
                      type="number"
                      required
                      className="form-input"
                      value={newRoomData.monthlyRent}
                      onChange={e => setNewRoomData({ ...newRoomData, monthlyRent: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <label className="checkbox-toggle">
                    <input
                      type="checkbox"
                      checked={newRoomData.hasAC}
                      onChange={e => setNewRoomData({ ...newRoomData, hasAC: e.target.checked })}
                    />
                    <span>Air Conditioned (AC Room)</span>
                  </label>

                  <label className="checkbox-toggle">
                    <input
                      type="checkbox"
                      checked={newRoomData.hasAttachedWashroom}
                      onChange={e => setNewRoomData({ ...newRoomData, hasAttachedWashroom: e.target.checked })}
                    />
                    <span>Attached Private Washroom</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddRoomModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Room & Generate Beds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Deallocate */}
      <ConfirmModal
        isOpen={Boolean(deallocateConfirmBed)}
        title="Deallocate Bed?"
        message="Are you sure you want to deallocate this bed? The resident will be marked as unallocated and the bed will become available."
        confirmLabel="Yes, Deallocate Bed"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeallocateConfirm}
        onCancel={() => setDeallocateConfirmBed(null)}
      />

      {/* WhatsApp Modal */}
      {selectedStudentForWA && (
        <WhatsAppModal
          student={selectedStudentForWA}
          onClose={() => setSelectedStudentForWA(null)}
        />
      )}
    </div>
  );
};

export default Rooms;
