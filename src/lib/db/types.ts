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
          severity: "low" | "medium" | "high" | "critical";
          analysis: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          title: string;
          source: string;
          description: string;
          status?: "draft" | "running" | "completed" | "failed";
          severity?: "low" | "medium" | "high" | "critical";
          analysis?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["incidents"]["Insert"]>;
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "agent_runs_incident_id_fkey";
            columns: ["incident_id"];
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          }
        ];
      };
      incident_chat_messages: {
        Row: {
          id: string;
          clerk_user_id: string;
          incident_id: string;
          role: "user" | "assistant";
          content: string;
          provider: string | null;
          model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          incident_id: string;
          role: "user" | "assistant";
          content: string;
          provider?: string | null;
          model?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["incident_chat_messages"]["Insert"]>;
        Relationships: [];
      };
      connector_configs: {
        Row: {
          id: string;
          clerk_user_id: string;
          connector_id: string;
          name: string;
          category: string;
          description: string;
          connected: boolean;
          token_configured: boolean;
          webhook_url: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          connector_id: string;
          name: string;
          category: string;
          description: string;
          connected?: boolean;
          token_configured?: boolean;
          webhook_url?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["connector_configs"]["Insert"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          clerk_user_id: string;
          full_name: string;
          email: string;
          company: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          clerk_user_id: string;
          full_name: string;
          email: string;
          company: string;
          role: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>;
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          clerk_user_id: string;
          critical: boolean;
          high: boolean;
          digest: boolean;
          remediation: boolean;
          connectors: boolean;
          updated_at: string;
        };
        Insert: {
          clerk_user_id: string;
          critical?: boolean;
          high?: boolean;
          digest?: boolean;
          remediation?: boolean;
          connectors?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_preferences"]["Insert"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          clerk_user_id: string;
          plan: "starter" | "pro" | "enterprise";
          status: "active" | "trialing" | "past_due" | "canceled";
          renews_at: string | null;
          usage: Json;
          updated_at: string;
        };
        Insert: {
          clerk_user_id: string;
          plan?: "starter" | "pro" | "enterprise";
          status?: "active" | "trialing" | "past_due" | "canceled";
          renews_at?: string | null;
          usage?: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [];
      };
      team_members: {
        Row: {
          id: string;
          clerk_user_id: string;
          name: string;
          email: string;
          role: "Owner" | "Admin" | "Member";
          initials: string;
          active: boolean;
          invited_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          name: string;
          email: string;
          role: "Owner" | "Admin" | "Member";
          initials: string;
          active?: boolean;
          invited_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
