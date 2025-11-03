"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { DistrictModal } from "./_components/district-modal";
import { LayerSwitch } from "./_components/layer-switch";

export default function Home() {
    const ref = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [open, setOpen] = useState(false);
    const [props, setProps] = useState(null);
    const [m, setM] = useState(null);

    // 2025 TIGERweb tracts → filter to Miami-Dade, return WGS84 GeoJSON
    const TRACTS_URL =
        "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0/query" +
        "?where=STATE%3D'12'%20AND%20COUNTY%3D'086'&outFields=*&outSR=4326&f=geojson";

    // 2025 TIGERweb block groups (optional, finer grid)
    const BGS_URL =
        "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/1/query" +
        "?where=STATE%3D'12'%20AND%20COUNTY%3D'086'&outFields=*&outSR=4326&f=geojson";

    useEffect(() => {
        if (!ref.current) return;
        const map = new maplibregl.Map({
            container: ref.current,
            style: `https://tiles.openfreemap.org/styles/bright`,
            center: [-80.5581339, 25.33465],
            zoom: 10,
            pitch: 45,
            bearing: -17.6,
            canvasContextAttributes: { antialias: true },
        });

        map.on("load", () => {
            map.addSource("miami-dade-commission", {
                type: "geojson",
                data: "https://gisms.miamidade.gov/arcgis/rest/services/CommissionDistrict_overall/MapServer/13/query?where=1%3D1&outFields=*&outSR=4326&f=geojson",
            });

            map.addSource("census-tracts", {
                type: "geojson",
                data: TRACTS_URL,
                promoteId: "GEOID",
            } as any);

            map.addSource("census-bgs", {
                type: "geojson",
                data: BGS_URL,
                promoteId: "GEOID",
            } as any);

            // --- find the first symbol layer with text to insert 3D below labels ---
            const layers = map.getStyle().layers || [];
            let labelLayerId: string | undefined = undefined;
            for (let i = 0; i < layers.length; i++) {
                const l: any = layers[i];
                if (l.type === "symbol" && l.layout && l.layout["text-field"]) {
                    labelLayerId = l.id;
                    break;
                }
            }

            // --- OpenFreeMap vector source ---
            if (!map.getSource("openfreemap")) {
                map.addSource("openfreemap", {
                    url: "https://tiles.openfreemap.org/planet",
                    type: "vector",
                } as any);
            }

            // --- 3D buildings ---
            if (!map.getLayer("3d-buildings")) {
                map.addLayer(
                    {
                        id: "3d-buildings",
                        source: "openfreemap",
                        "source-layer": "building",
                        type: "fill-extrusion",
                        minzoom: 15,
                        filter: ["!=", ["get", "hide_3d"], true],
                        paint: {
                            // dark-blue ramp by render_height
                            "fill-extrusion-color": [
                                "interpolate",
                                ["linear"],
                                ["get", "render_height"],
                                0,
                                "#0b1b3b", // bg
                                150,
                                "#0e2a5a", // deep
                                300,
                                "#133a7c", // mid
                                450,
                                "#1f4d99", // lite
                                600,
                                "#2b6cb0", // accent
                            ],
                            "fill-extrusion-height": [
                                "interpolate",
                                ["linear"],
                                ["zoom"],
                                15,
                                0,
                                16,
                                ["get", "render_height"],
                            ],
                            "fill-extrusion-base": [
                                "case",
                                [">=", ["get", "zoom"], 16],
                                ["get", "render_min_height"],
                                0,
                            ],
                            "fill-extrusion-opacity": 0.9,
                        },
                    } as any,
                    labelLayerId
                );
            }

            applyDarkBlueTheme(map);

            const base = "#d32f2f"; // base red
            const hover = "#8b0000"; // darker red on hover
            const line = "#7f1d1d"; // dark red outline
            const lineHover = "#ff3b3b"; // brighter red outline on hover

            const setupHover = (layerId, sourceId) => {
                let hoveredId = null;

                map.on("mousemove", layerId, (e) => {
                    const f = e.features?.[0];
                    console.log("old hoveredId", hoveredId);

                    // clear previous hover
                    if (hoveredId !== null && hoveredId !== f.id) {
                        map.setFeatureState(
                            { source: sourceId, id: hoveredId },
                            { hover: false }
                        );
                    }

                    hoveredId = f?.id;
                    console.log("curr hoveredId", hoveredId);

                    // set current
                    map.setFeatureState(
                        { source: sourceId, id: hoveredId },
                        { hover: true }
                    );
                });

                map.on("mouseleave", layerId, () => {
                    if (hoveredId !== null) {
                        map.setFeatureState(
                            {
                                source: sourceId,
                                id: hoveredId,
                            },
                            {
                                hover: false,
                            }
                        );
                        hoveredId = null;
                    }
                });
            };

            // Add Layers

            map.addLayer({
                id: "mdc-districts-fill",
                type: "fill",
                source: "miami-dade-commission",
                layout: {},
                paint: {
                    "fill-color": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false],
                        hover, // hover color
                        base, // normal
                    ],
                    "fill-opacity": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false],
                        0.85,
                        0.3,
                    ],
                },
            });

            map.addLayer({
                id: "mdc-districts-line",
                type: "line",
                source: "miami-dade-commission",
                paint: { "line-color": "#ffa500", "line-width": 1 },
            });

            map.addLayer({
                id: "census-tracts-line",
                type: "line",
                source: "census-tracts",
                layout: {
                    visibility: "none",
                },
                paint: {
                    "line-color": "#ffffff",
                    "line-width": 0.6,
                    "line-opacity": 0.6,
                },
            } as any);

            map.addLayer({
                id: "census-tracts-fill",
                type: "fill",
                source: "census-tracts",
                layout: {
                    visibility: "none",
                },
                paint: {
                    "fill-color": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false],
                        hover, // hover color
                        base, // normal
                    ],
                    "fill-opacity": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false],
                        0.85,
                        0.3,
                    ],
                },
            } as any);

            map.addLayer({
                id: "census-bgs-line",
                type: "line",
                source: "census-bgs",
                layout: {
                    visibility: "none",
                },
                paint: {
                    "line-color": "#61F527",
                    "line-width": 1,
                    "line-opacity": 1,
                },
            } as any);

            map.addLayer({
                id: "census-bgs-fill",
                type: "fill",
                source: "census-bgs",
                layout: {
                    visibility: "none",
                },
                paint: {
                    "fill-color": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false],
                        hover, // hover color
                        base, // normal
                    ],
                    "fill-opacity": [
                        "case",
                        ["boolean", ["feature-state", "hover"], false],
                        0.85,
                        0.3,
                    ],
                },
            } as any);

            setupHover("mdc-districts-fill", "miami-dade-commission");
            setupHover("census-bgs-fill", "census-bgs");
            setupHover("census-tracts-fill", "census-tracts");
        });

        /** Repaints common OpenFreeMap/OpenMapTiles layer ids in dark blues. Safe if a layer is missing. */
        function applyDarkBlueTheme(map: maplibregl.Map) {
            const bg = "#0b1b3b";
            const deep = "#0e2a5a";
            const mid = "#133a7c";
            const lite = "#1f4d99";
            const acc = "#2b6cb0";
            const text = "#c9d7ff";

            const setPaint = (id: string, prop: string, val: any) => {
                if (map.getLayer(id)) map.setPaintProperty(id, prop, val);
            };
            const colorize = (ids: string[], prop: string, val: any) =>
                ids.forEach((id) => setPaint(id, prop, val));

            // background
            const bgLayerId = "background";
            if (map.getLayer(bgLayerId)) {
                setPaint(bgLayerId, "background-color", bg);
            } else {
                map.addLayer({
                    id: "bg",
                    type: "background",
                    paint: { "background-color": bg },
                } as any);
            }

            // land / parks / buildings (2D)
            colorize(
                ["land", "landcover", "landuse", "park"],
                "fill-color",
                deep
            );
            setPaint("building", "fill-color", mid);
            setPaint("building", "fill-outline-color", deep);

            // water
            colorize(["water"], "fill-color", mid);
            setPaint("waterway", "line-color", lite);

            // roads (common ids in OpenFreeMap styles)
            const road = (ids: string[], color: string, opacity = 0.85) => {
                ids.forEach((id) => {
                    setPaint(id, "line-color", color);
                    setPaint(id, "line-opacity", opacity);
                });
            };
            road(["motorway", "trunk"], acc);
            road(["primary", "secondary"], lite);
            road(["tertiary", "minor", "service", "street"], mid);

            // bridges/tunnels if present
            road(["motorway_bridge", "bridge", "street_bridge"], "#2a57a0");
            road(
                ["motorway_tunnel", "tunnel", "street_tunnel"],
                "#0a2454",
                0.75
            );

            // boundaries
            road(["boundary", "admin"], "#3c5aa8", 0.7);

            // labels
            [
                "place_label",
                "road_label",
                "water_label",
                "poi_label",
                "housenumber",
            ].forEach((id) => {
                setPaint(id, "text-color", text);
                setPaint(id, "text-halo-color", bg);
                setPaint(id, "text-halo-width", 1.0);
            });

            // symbols / extrusions general tweaks
            map.getStyle().layers?.forEach((l: any) => {
                if (l.type === "symbol") {
                    setPaint(l.id, "icon-opacity", 0.9);
                    setPaint(l.id, "text-opacity", 0.92);
                }
                if (l.type === "fill-extrusion" && l.id !== "3d-buildings") {
                    setPaint(l.id, "fill-extrusion-color", mid);
                    setPaint(l.id, "fill-extrusion-opacity", 0.85);
                }
            });
        }

        // Map Controls
        map.addControl(new maplibregl.NavigationControl(), "top-right");

        // Click Open Modal
        const onClick = (e) => {
            const f = e.features?.[0];
            if (!f) return;
            setProps(f.properties as Record<string, any>);
            setOpen(true);
        };

        map.on("click", "mdc-districts-fill", onClick);

        mapRef.current = map;
        return () => map.remove();
    }, [m]);

    const getMap = () => mapRef.current;
    return (
        <div className="relative">
            <div ref={ref} style={{ height: "100vh", width: "100%" }}></div>;
            <div className="absolute top-0 left-0 z-50 w-64 border-l p-3 space-y-2 bg-white/80 backdrop-blur">
                <LayerSwitch
                    label="Districts"
                    layers={["mdc-districts-fill", "mdc-districts-line"]}
                    getMap={getMap}
                    defaultOn={true}
                />
                <LayerSwitch
                    label="Census Tracts"
                    layers={["census-tracts-fill", "census-tracts-line"]}
                    getMap={getMap}
                    defaultOn={false}
                />
                <LayerSwitch
                    label="Block Groups"
                    layers={["census-bgs-fill", "census-bgs-line"]}
                    getMap={getMap}
                    defaultOn={false}
                />
            </div>
            <DistrictModal
                open={open}
                onClose={() => setOpen(false)}
                props={props}
            />
        </div>
    );
}
