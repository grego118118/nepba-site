"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

import { FEATURE_META, type FeatureType, type Phase } from "@/lib/feature-types";

type PostPoint = {
  id: string;
  label: string;
  phase: Phase;
  lng: number;
  lat: number;
  assignedCount: number;
};

type FeatureRow = {
  id: string;
  featureType: FeatureType;
  phase: Phase;
  label: string | null;
  geometry: unknown;
};

export type DraftFeature = {
  featureType: FeatureType;
  coordinates: number[][] | number[] | number[][][];
};

export type PlanMapHandlers = {
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onPostClick?: (postId: string) => void;
  onMapViewChange?: (view: { center: [number, number]; zoom: number }) => void;
};

type Props = {
  mapboxToken: string;
  center: [number, number];
  zoom: number;
  phase: Exclude<Phase, "both">;
  posts: PostPoint[];
  features: FeatureRow[];
  selectedPostId?: string | null;
  drawingFeatureType: FeatureType | null;
  onDraftComplete?: (draft: DraftFeature) => void;
  handlers?: PlanMapHandlers;
  interactive?: boolean;
  fitToContent?: boolean;
  className?: string;
};

const PHASE_PALETTE: Record<Phase, string> = {
  incoming: "#16a34a",
  outgoing: "#ea580c",
  both: "#2563eb",
};

export function PlanMap(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const draftPointsRef = useRef<number[][]>([]);
  const draftMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const handlersRef = useRef(props.handlers);
  handlersRef.current = props.handlers;
  const onDraftCompleteRef = useRef(props.onDraftComplete);
  onDraftCompleteRef.current = props.onDraftComplete;
  const drawingFeatureTypeRef = useRef(props.drawingFeatureType);
  drawingFeatureTypeRef.current = props.drawingFeatureType;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!props.mapboxToken) return;
    mapboxgl.accessToken = props.mapboxToken;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: props.center,
      zoom: props.zoom,
      interactive: props.interactive ?? true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("plan-features", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "feature-lines",
        type: "line",
        source: "plan-features",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#2563eb"],
          "line-width": 4,
          "line-opacity": 0.85,
          "line-dasharray": ["case", ["==", ["get", "dashed"], true], ["literal", [2, 1]], ["literal", [1]]],
        },
      });
      map.addLayer({
        id: "feature-fills",
        type: "fill",
        source: "plan-features",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "#2563eb"],
          "fill-opacity": 0.18,
        },
      });
      map.addLayer({
        id: "feature-outlines",
        type: "line",
        source: "plan-features",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#2563eb"],
          "line-width": 2,
        },
      });
      map.addLayer({
        id: "feature-points",
        type: "circle",
        source: "plan-features",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 6,
          "circle-color": ["coalesce", ["get", "color"], "#2563eb"],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
      // Flow arrow head decoration via symbols
      try {
        map.loadImage(
          "https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png",
          () => undefined,
        );
      } catch {
        // ignore
      }
      syncFeatures();
      syncPosts();
    });

    map.on("click", (e) => {
      const drawingType = drawingFeatureTypeRef.current;
      if (drawingType) {
        const geom = FEATURE_META[drawingType].geometry;
        const point: number[] = [e.lngLat.lng, e.lngLat.lat];
        draftPointsRef.current.push(point);
        const marker = new mapboxgl.Marker({ color: "#0f172a" })
          .setLngLat(point as [number, number])
          .addTo(map);
        draftMarkersRef.current.push(marker);
        if (geom === "Point") {
          finishDraft();
        }
        return;
      }
      // Otherwise, this is a map click for adding a post or unselect.
      handlersRef.current?.onMapClick?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    map.on("dblclick", (e) => {
      if (!drawingFeatureTypeRef.current) return;
      e.preventDefault();
      finishDraft();
    });

    map.on("moveend", () => {
      const c = map.getCenter();
      handlersRef.current?.onMapViewChange?.({
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mapboxToken]);

  function finishDraft() {
    const drawingType = drawingFeatureTypeRef.current;
    if (!drawingType) return;
    const pts = draftPointsRef.current;
    const meta = FEATURE_META[drawingType];
    let coords: DraftFeature["coordinates"] | null = null;
    if (meta.geometry === "Point" && pts.length >= 1) {
      coords = pts[0];
    } else if (meta.geometry === "LineString" && pts.length >= 2) {
      coords = pts.slice();
    } else if (meta.geometry === "Polygon" && pts.length >= 3) {
      const ring = pts.slice();
      ring.push(ring[0]);
      coords = [ring];
    }
    draftMarkersRef.current.forEach((m) => m.remove());
    draftMarkersRef.current = [];
    draftPointsRef.current = [];
    if (coords) {
      onDraftCompleteRef.current?.({ featureType: drawingType, coordinates: coords });
    }
  }

  // Sync post markers when posts/phase change.
  useEffect(() => {
    syncPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.posts, props.phase, props.selectedPostId]);

  function syncPosts() {
    const map = mapRef.current;
    if (!map) return;
    const visible = props.posts.filter(
      (p) => p.phase === "both" || p.phase === props.phase,
    );
    const seen = new Set<string>();
    for (const p of visible) {
      seen.add(p.id);
      let marker = markersRef.current.get(p.id);
      const el = renderPostMarker(p, p.id === props.selectedPostId, props.phase);
      if (!marker) {
        marker = new mapboxgl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
        markersRef.current.set(p.id, marker);
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          handlersRef.current?.onPostClick?.(p.id);
        });
      } else {
        marker.setLngLat([p.lng, p.lat]);
        marker.getElement().replaceWith(el);
        marker.getElement = () => el;
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          handlersRef.current?.onPostClick?.(p.id);
        });
      }
    }
    for (const [id, marker] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
  }

  // Sync features when features/phase change.
  useEffect(() => {
    syncFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.features, props.phase]);

  function syncFeatures() {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("plan-features") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    const visible = props.features.filter(
      (f) => f.phase === "both" || f.phase === props.phase,
    );
    const fc = {
      type: "FeatureCollection" as const,
      features: visible.map((f) => ({
        type: "Feature" as const,
        properties: {
          id: f.id,
          color: FEATURE_META[f.featureType].color,
          label: f.label,
          dashed: f.featureType === "road_closure" || f.featureType === "bus_route",
        },
        geometry: toGeoJSONGeometry(f.featureType, f.geometry),
      })),
    };
    src.setData(fc);
  }

  return (
    <div className={props.className ?? "h-full w-full"}>
      {props.mapboxToken ? (
        <div ref={containerRef} className="h-full w-full" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 p-6 text-center text-sm text-slate-600">
          Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in <code>.env.local</code> to load the map.
        </div>
      )}
    </div>
  );

  function renderPostMarker(p: PostPoint, selected: boolean, phase: Phase) {
    const wrap = document.createElement("div");
    wrap.className = "tp-marker";
    wrap.style.cursor = "pointer";
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.transform = "translateY(-4px)";

    const pin = document.createElement("div");
    const color = PHASE_PALETTE[p.phase] ?? PHASE_PALETTE[phase] ?? "#2563eb";
    pin.style.width = selected ? "28px" : "22px";
    pin.style.height = selected ? "28px" : "22px";
    pin.style.borderRadius = "9999px";
    pin.style.background = color;
    pin.style.color = "#fff";
    pin.style.display = "flex";
    pin.style.alignItems = "center";
    pin.style.justifyContent = "center";
    pin.style.border = selected ? "3px solid #0f172a" : "2px solid #fff";
    pin.style.boxShadow = "0 2px 6px rgba(0,0,0,0.25)";
    pin.style.fontSize = "11px";
    pin.style.fontWeight = "700";
    pin.textContent = String(p.label).slice(0, 3).toUpperCase();
    wrap.appendChild(pin);

    if (p.assignedCount > 0) {
      const badge = document.createElement("div");
      badge.style.marginTop = "2px";
      badge.style.padding = "1px 5px";
      badge.style.borderRadius = "9999px";
      badge.style.background = "#0f172a";
      badge.style.color = "#fff";
      badge.style.fontSize = "10px";
      badge.style.fontWeight = "600";
      badge.textContent = `${p.assignedCount}`;
      wrap.appendChild(badge);
    }
    return wrap;
  }
}

function toGeoJSONGeometry(featureType: FeatureType, geometry: unknown): GeoJSON.Geometry {
  const meta = FEATURE_META[featureType];
  if (
    typeof geometry === "object" &&
    geometry !== null &&
    "type" in (geometry as Record<string, unknown>)
  ) {
    return geometry as GeoJSON.Geometry;
  }
  if (meta.geometry === "Point") {
    return { type: "Point", coordinates: geometry as number[] };
  }
  if (meta.geometry === "LineString") {
    return { type: "LineString", coordinates: geometry as number[][] };
  }
  return { type: "Polygon", coordinates: geometry as number[][][] };
}
