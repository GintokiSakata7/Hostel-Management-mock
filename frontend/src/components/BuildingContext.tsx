import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Building {
  id: string;
  name: string;
  totalRooms?: number;
  totalBeds?: number;
  availableBeds?: number;
}

interface BuildingContextType {
  selectedBuildingId: string; // 'all' or specific building UUID
  setSelectedBuildingId: (id: string) => void;
  buildings: Building[];
  fetchBuildings: () => Promise<void>;
  activeBuildingName: string;
}

const BuildingContext = createContext<BuildingContextType | undefined>(undefined);

export function BuildingProvider({ children }: { children: React.ReactNode }) {
  const [selectedBuildingId, setSelectedBuildingIdState] = useState<string>(() => {
    return localStorage.getItem('selectedBuildingId') || '';
  });
  const [buildings, setBuildings] = useState<Building[]>([]);

  const setSelectedBuildingId = (id: string) => {
    setSelectedBuildingIdState(id);
    localStorage.setItem('selectedBuildingId', id);
  };

  const fetchBuildings = useCallback(async () => {
    try {
      const res = await fetch('/api/buildings');
      if (res.ok) {
        const data = await res.json();
        setBuildings(data);

        // If no building stored in localStorage or invalid, default to first building (e.g. Building A)
        const saved = localStorage.getItem('selectedBuildingId');
        if (!saved) {
          if (data && data.length > 0) {
            setSelectedBuildingIdState(data[0].id);
            localStorage.setItem('selectedBuildingId', data[0].id);
          } else {
            setSelectedBuildingIdState('all');
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch buildings:', e);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  const activeBuilding = buildings.find(b => b.id === selectedBuildingId);
  const activeBuildingName = selectedBuildingId === 'all'
    ? 'All Buildings (Global View)'
    : activeBuilding ? activeBuilding.name : 'Hostel Building';

  return (
    <BuildingContext.Provider
      value={{
        selectedBuildingId,
        setSelectedBuildingId,
        buildings,
        fetchBuildings,
        activeBuildingName
      }}
    >
      {children}
    </BuildingContext.Provider>
  );
}

export function useBuilding() {
  const context = useContext(BuildingContext);
  if (!context) {
    throw new Error('useBuilding must be used within a BuildingProvider');
  }
  return context;
}
