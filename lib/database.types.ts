// Hand-maintained to mirror supabase/schema.sql.
// Regenerate with `supabase gen types typescript` once the Supabase CLI is wired up.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MenuCategory = "อาหาร" | "เครื่องดื่ม" | "ของเพิ่ม";
export type OrderStatus = "completed" | "pending" | "cancelled";

export type Database = {
  public: {
    Tables: {
      menus: {
        Row: {
          id: string;
          name: string;
          price: number;
          category: MenuCategory;
          is_available: boolean;
          special_surcharge: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          category: MenuCategory;
          is_available?: boolean;
          special_surcharge?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          category?: MenuCategory;
          is_available?: boolean;
          special_surcharge?: number | null;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          created_at: string;
          total: number;
          status: OrderStatus;
          note: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          total?: number;
          status?: OrderStatus;
          note?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          total?: number;
          status?: OrderStatus;
          note?: string | null;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_id: string;
          quantity: number;
          price: number;
          is_special: boolean;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_id: string;
          quantity: number;
          price: number;
          is_special?: boolean;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_id?: string;
          quantity?: number;
          price?: number;
          is_special?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_menu_id_fkey";
            columns: ["menu_id"];
            referencedRelation: "menus";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_order: {
        Args: { p_note: string | null; p_items: Json };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Menu = Database["public"]["Tables"]["menus"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
