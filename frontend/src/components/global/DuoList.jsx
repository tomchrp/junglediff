/**
 * ============================================================================
 * FICHIER : frontend/src/components/global/DuoList.jsx
 * ============================================================================
 */
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import DuoRowCard from './DuoRowCard.jsx';

const DuoList = ({ data, activeDuo, onSelect, versionDDragon, championMap, primaryLane }) => {
    const parentRef = useRef(null);

    const rowVirtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 78,
        overscan: 5,
    });

    if (data.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-lol-textMuted uppercase text-sm tracking-widest">
                Aucun duo trouvé pour cette combinaison.
            </div>
        );
    }

    return (
        <div ref={parentRef} className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const duo = data[virtualRow.index];
                    const isActive = activeDuo && activeDuo.champ_a === duo.champ_a && activeDuo.champ_b === duo.champ_b;

                    return (
                        <div
                            key={virtualRow.index}
                            style={{
                                position: 'absolute', top: 0, left: 0, width: '100%',
                                height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className="pb-2"
                        >
                            <DuoRowCard
                                rank={virtualRow.index + 1}
                                duo={duo}
                                isActive={isActive}
                                onClick={() => onSelect(isActive ? null : duo)}
                                versionDDragon={versionDDragon}
                                championMap={championMap}
                                primaryLane={primaryLane}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DuoList;