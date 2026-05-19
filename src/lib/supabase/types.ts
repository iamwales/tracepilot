export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      incidents: {
        Row: {
          id: string;
          clerk_user_id: string;
          title: string;
          source: string;
          description: string;
          status: "draft" | "running" | "completed" | "failed";
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          title: string;
          source: string;
          description: string;
          status?: "draft" | "running" | "completed" | "failed";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["incidents"]["Insert"]>;
      };
      agent_runs: {
        Row: {
          id: string;
          incident_id: string;
          stage: string;
          status: "queued" | "running" | "completed" | "failed";
          output: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          incident_id: string;
          stage: string;
          status?: "queued" | "running" | "completed" | "failed";
          output?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_runs"]["Insert"]>;
      };
    };
  };
};
