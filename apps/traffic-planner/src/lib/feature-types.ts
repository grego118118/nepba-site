export type FeatureType =
  | "flow_arrow"
  | "road_closure"
  | "parking_lot"
  | "parking_entrance"
  | "pedestrian_crossing"
  | "crowd_zone"
  | "barricade"
  | "cone_line"
  | "dropoff_zone"
  | "vip_zone"
  | "ada_zone"
  | "bus_route"
  | "bus_stop";

export type Phase = "incoming" | "outgoing" | "both";

export const FEATURE_META: Record<
  FeatureType,
  { label: string; color: string; geometry: "Point" | "LineString" | "Polygon" }
> = {
  flow_arrow: { label: "Traffic flow", color: "#2563eb", geometry: "LineString" },
  road_closure: { label: "Road closure", color: "#dc2626", geometry: "LineString" },
  parking_lot: { label: "Parking lot", color: "#0891b2", geometry: "Polygon" },
  parking_entrance: { label: "Parking entrance", color: "#0e7490", geometry: "Point" },
  pedestrian_crossing: { label: "Ped crossing", color: "#f59e0b", geometry: "LineString" },
  crowd_zone: { label: "Crowd zone", color: "#ca8a04", geometry: "Polygon" },
  barricade: { label: "Barricade", color: "#b91c1c", geometry: "LineString" },
  cone_line: { label: "Cone line", color: "#ea580c", geometry: "LineString" },
  dropoff_zone: { label: "Drop-off", color: "#7c3aed", geometry: "Polygon" },
  vip_zone: { label: "VIP", color: "#a21caf", geometry: "Polygon" },
  ada_zone: { label: "ADA", color: "#0d9488", geometry: "Polygon" },
  bus_route: { label: "Bus route", color: "#1d4ed8", geometry: "LineString" },
  bus_stop: { label: "Bus stop", color: "#1e40af", geometry: "Point" },
};

export const FEATURE_TYPES = Object.keys(FEATURE_META) as FeatureType[];
