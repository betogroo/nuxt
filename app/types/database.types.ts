export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  pgbouncer: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth: {
        Args: { p_usename: string }
        Returns: {
          password: string
          username: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      demand_product_bids: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          demand_product_id: string
          id: string
          supplier_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          demand_product_id: string
          id?: string
          supplier_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          demand_product_id?: string
          id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_product_bids_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_product_bids_demand_product_id_fkey"
            columns: ["demand_product_id"]
            referencedRelation: "demand_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_product_bids_supplier_id_fkey"
            columns: ["supplier_id"]
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_products: {
        Row: {
          bid_interval: number | null
          bid_interval_type: string | null
          created_at: string
          created_by: string | null
          demand_id: string
          expense_nature_name_snapshot: string | null
          id: string
          product_id: string
          product_name_snapshot: string | null
          quantity: number
          reference_price: number | null
          sort_order: number
          unit_id: string
          unit_name_snapshot: string | null
          updated_at: string
        }
        Insert: {
          bid_interval?: number | null
          bid_interval_type?: string | null
          created_at?: string
          created_by?: string | null
          demand_id: string
          expense_nature_name_snapshot?: string | null
          id?: string
          product_id: string
          product_name_snapshot?: string | null
          quantity?: number
          reference_price?: number | null
          sort_order?: number
          unit_id: string
          unit_name_snapshot?: string | null
          updated_at?: string
        }
        Update: {
          bid_interval?: number | null
          bid_interval_type?: string | null
          created_at?: string
          created_by?: string | null
          demand_id?: string
          expense_nature_name_snapshot?: string | null
          id?: string
          product_id?: string
          product_name_snapshot?: string | null
          quantity?: number
          reference_price?: number | null
          sort_order?: number
          unit_id?: string
          unit_name_snapshot?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_products_demand_id_fkey"
            columns: ["demand_id"]
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_products_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_products_unit_id_fkey"
            columns: ["unit_id"]
            referencedRelation: "measurement_units"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_responsibles: {
        Row: {
          created_at: string
          demand_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          demand_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          demand_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_responsibles_demand_id_fkey"
            columns: ["demand_id"]
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_responsibles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demands: {
        Row: {
          bidding_notice_number: string | null
          contract_number: string | null
          created_at: string
          dispute_date: string | null
          dispute_number: string | null
          id: string
          id_pca: string | null
          internal_process_number: string | null
          is_return_requested: boolean | null
          name: string
          offer_opening_date: string | null
          process_number: string | null
          status: Database["public"]["Enums"]["demand_status"]
          type: Database["public"]["Enums"]["demand_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bidding_notice_number?: string | null
          contract_number?: string | null
          created_at?: string
          dispute_date?: string | null
          dispute_number?: string | null
          id?: string
          id_pca?: string | null
          internal_process_number?: string | null
          is_return_requested?: boolean | null
          name: string
          offer_opening_date?: string | null
          process_number?: string | null
          status?: Database["public"]["Enums"]["demand_status"]
          type: Database["public"]["Enums"]["demand_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bidding_notice_number?: string | null
          contract_number?: string | null
          created_at?: string
          dispute_date?: string | null
          dispute_number?: string | null
          id?: string
          id_pca?: string | null
          internal_process_number?: string | null
          is_return_requested?: boolean | null
          name?: string
          offer_opening_date?: string | null
          process_number?: string | null
          status?: Database["public"]["Enums"]["demand_status"]
          type?: Database["public"]["Enums"]["demand_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demands_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_natures: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_pending: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          is_pending?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_pending?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      iirgd_citizens: {
        Row: {
          cpf: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          rg: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          rg?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          rg?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iirgd_citizens_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      iirgd_demand_status_history: {
        Row: {
          created_at: string
          created_by: string | null
          demand_id: string
          id: string
          observation: string | null
          status: Database["public"]["Enums"]["iirgd_demand_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          demand_id: string
          id?: string
          observation?: string | null
          status: Database["public"]["Enums"]["iirgd_demand_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          demand_id?: string
          id?: string
          observation?: string | null
          status?: Database["public"]["Enums"]["iirgd_demand_status"]
        }
        Relationships: [
          {
            foreignKeyName: "iirgd_demand_status_history_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iirgd_demand_status_history_demand_id_fkey"
            columns: ["demand_id"]
            referencedRelation: "iirgd_demands"
            referencedColumns: ["id"]
          },
        ]
      }
      iirgd_demands: {
        Row: {
          citizen_id: string
          created_at: string | null
          created_by: string | null
          document_type_id: string | null
          id: string
          observation: string | null
          station_code: string
          status: Database["public"]["Enums"]["iirgd_demand_status"]
          updated_at: string | null
        }
        Insert: {
          citizen_id: string
          created_at?: string | null
          created_by?: string | null
          document_type_id?: string | null
          id?: string
          observation?: string | null
          station_code: string
          status?: Database["public"]["Enums"]["iirgd_demand_status"]
          updated_at?: string | null
        }
        Update: {
          citizen_id?: string
          created_at?: string | null
          created_by?: string | null
          document_type_id?: string | null
          id?: string
          observation?: string | null
          station_code?: string
          status?: Database["public"]["Enums"]["iirgd_demand_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iirgd_demands_citizen_id_fkey"
            columns: ["citizen_id"]
            referencedRelation: "iirgd_citizens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iirgd_demands_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iirgd_demands_document_type_id_fkey"
            columns: ["document_type_id"]
            referencedRelation: "iirgd_document_types"
            referencedColumns: ["id"]
          },
        ]
      }
      iirgd_document_types: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_pending: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pending?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pending?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_unit_aliases: {
        Row: {
          code: number
          created_at: string
          id: string
          is_pending: boolean
          name: string
          unit_id: string | null
        }
        Insert: {
          code: number
          created_at?: string
          id?: string
          is_pending?: boolean
          name: string
          unit_id?: string | null
        }
        Update: {
          code?: number
          created_at?: string
          id?: string
          is_pending?: boolean
          name?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "measurement_unit_aliases_unit_id_fkey"
            columns: ["unit_id"]
            referencedRelation: "measurement_units"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_units: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_pending: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_pending?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_pending?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_classes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_pending: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          is_pending?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_pending?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_units: {
        Row: {
          created_at: string
          id: string
          product_id: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          unit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_units_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_units_unit_id_fkey"
            columns: ["unit_id"]
            referencedRelation: "measurement_units"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          created_by: string | null
          expense_nature_id: string
          id: string
          is_active: boolean
          name: string
          product_class_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expense_nature_id: string
          id?: string
          is_active?: boolean
          name: string
          product_class_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expense_nature_id?: string
          id?: string
          is_active?: boolean
          name?: string
          product_class_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_expense_nature_id_fkey"
            columns: ["expense_nature_id"]
            referencedRelation: "expense_natures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_product_class_id_fkey"
            columns: ["product_class_id"]
            referencedRelation: "product_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string | null
          role: Database["public"]["Enums"]["user_role"]
          theme: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          is_active?: boolean
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          theme?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          theme?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          cell_phone: string | null
          cnpj: string
          company_name: string
          created_at: string
          created_by: string | null
          email: string
          has_bb_account: string | null
          id: string
          is_active: boolean
          is_simples_optant: boolean
          landline: string | null
          responsible_name: string | null
          simples_optant_verified_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cell_phone?: string | null
          cnpj: string
          company_name: string
          created_at?: string
          created_by?: string | null
          email: string
          has_bb_account?: string | null
          id?: string
          is_active?: boolean
          is_simples_optant?: boolean
          landline?: string | null
          responsible_name?: string | null
          simples_optant_verified_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cell_phone?: string | null
          cnpj?: string
          company_name?: string
          created_at?: string
          created_by?: string | null
          email?: string
          has_bb_account?: string | null
          id?: string
          is_active?: boolean
          is_simples_optant?: boolean
          landline?: string | null
          responsible_name?: string | null
          simples_optant_verified_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_own_profile: { Args: { profile_id: string }; Returns: boolean }
      get_my_current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      demand_status:
        | "planning"
        | "quotation"
        | "bidding_notice"
        | "dispute"
        | "homologation"
        | "completed"
        | "cancelled"
      demand_type: "consumption" | "permanent"
      iirgd_demand_status:
        | "new"
        | "confronted"
        | "released"
        | "issued"
        | "mailbag"
        | "cegaf"
        | "no_data"
        | "other_pending"
        | "protocol_cancelled"
        | "awaiting_collection"
        | "confrontation_failed"
      user_role: "user" | "admin" | "iirgd_user" | "uge" | "iirgd_manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  pgbouncer: {
    Enums: {},
  },
  public: {
    Enums: {
      demand_status: [
        "planning",
        "quotation",
        "bidding_notice",
        "dispute",
        "homologation",
        "completed",
        "cancelled",
      ],
      demand_type: ["consumption", "permanent"],
      iirgd_demand_status: [
        "new",
        "confronted",
        "released",
        "issued",
        "mailbag",
        "cegaf",
        "no_data",
        "other_pending",
        "protocol_cancelled",
        "awaiting_collection",
        "confrontation_failed",
      ],
      user_role: ["user", "admin", "iirgd_user", "uge", "iirgd_manager"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
