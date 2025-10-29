"use client";

import { useEffect, useState } from "react";
import maplibregl from "maplibre-gl";

export function LayerSwitch({
    label,
    layers,
    getMap,
    defaultOn = true,
}: {
    label: string;
    layers: string[];
    getMap: () => maplibregl.Map | null;
    defaultOn?: boolean;
}) {
    const [on, setOn] = useState(defaultOn);

    useEffect(() => {
        const map = getMap();
        if (!map) return;
        layers.forEach((id) => {
            map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
            
        });
    }, [on, getMap, layers]);
    return (
        <label className="flex items-center gap-2 text-sm text-black">
            <input
                type="checkbox"
                checked={on}
                onChange={(e) => setOn(e.target.checked)}
            ></input>
            {label}
        </label>
    );
}
