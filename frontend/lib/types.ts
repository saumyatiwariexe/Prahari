export type DensityColor = "green" | "amber" | "red" | "critical";
export type SystemStatus = "normal" | "monitoring" | "active" | "critical";
export type InterventionStatus = "fired" | "staged" | "pending_confirm" | "cancelled" | "confirmed";
export type InterventionLevel = 1 | 2 | 3;

export interface FlowVector {
  dx: number;
  dy: number;
  magnitude: number;
}

export interface ZoneState {
  density: number;
  count: number;
  color: DensityColor;
  name: string;
  flow_vector: FlowVector;
}

export interface PredictionPoint {
  density: number;
  color: DensityColor;
}

export interface ZonePrediction {
  t30: PredictionPoint;
  t60: PredictionPoint;
  t90: PredictionPoint;
}

export interface Intervention {
  id: string;
  zone: string;
  level: InterventionLevel;
  trigger: string;
  action: string;
  timestamp: string;
  status: InterventionStatus;
  response_time_ms: number;
  countdown_remaining?: number;
  side?: "crowdguard" | "human";
}

export interface PersonBbox {
  x1: number; y1: number; x2: number; y2: number;
}

export interface LiveUpdate {
  elapsed: number;
  crowdguard: {
    zones: Record<string, ZoneState>;
    predictions: Record<string, ZonePrediction>;
    l1_fired: boolean;
  };
  human: {
    zones: Record<string, ZoneState>;
    crush_occurred: boolean;
    human_responded: boolean;
  };
  interventions: Intervention[];
  staged: Intervention[];
  system_status: SystemStatus;
  persons?: PersonBbox[];
  video_ready?: boolean;
}
