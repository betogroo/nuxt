export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
      ballot_boxes: {
        Row: {
          created_at: string
          created_by: string | null
          current_voter_id: string | null
          current_voter_name: string | null
          current_voter_registration_number: string | null
          deleted_at: string | null
          device_info: string | null
          election_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_voter_id?: string | null
          current_voter_name?: string | null
          current_voter_registration_number?: string | null
          deleted_at?: string | null
          device_info?: string | null
          election_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_voter_id?: string | null
          current_voter_name?: string | null
          current_voter_registration_number?: string | null
          deleted_at?: string | null
          device_info?: string | null
          election_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ballot_boxes_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ballot_boxes_current_voter_id_fkey'
            columns: ['current_voter_id']
            referencedRelation: 'election_voters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ballot_boxes_election_id_fkey'
            columns: ['election_id']
            referencedRelation: 'elections'
            referencedColumns: ['id']
          },
        ]
      }
      candidates: {
        Row: {
          candidate_number: string
          created_at: string
          deleted_at: string | null
          election_id: string
          id: string
          name: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          candidate_number: string
          created_at?: string
          deleted_at?: string | null
          election_id: string
          id?: string
          name: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          candidate_number?: string
          created_at?: string
          deleted_at?: string | null
          election_id?: string
          id?: string
          name?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'candidates_election_id_fkey'
            columns: ['election_id']
            referencedRelation: 'elections'
            referencedColumns: ['id']
          },
        ]
      }
      demand_commitment_liquidations: {
        Row: {
          commitment_id: string
          created_at: string
          created_by: string | null
          id: string
          issue_date: string
          liquidation_number: string
          observation: string | null
        }
        Insert: {
          commitment_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          issue_date?: string
          liquidation_number: string
          observation?: string | null
        }
        Update: {
          commitment_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          issue_date?: string
          liquidation_number?: string
          observation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'demand_commitment_liquidations_commitment_id_fkey'
            columns: ['commitment_id']
            referencedRelation: 'demand_commitments'
            referencedColumns: ['id']
          },
        ]
      }
      demand_commitments: {
        Row: {
          bank_order_issued_at: string | null
          bank_order_number: string | null
          bank_order_observation: string | null
          commitment_number: string
          created_at: string
          created_by: string | null
          demand_id: string
          disbursement_program_issued_at: string | null
          disbursement_program_number: string | null
          disbursement_program_observation: string | null
          error_details: string | null
          expense_nature_id: string | null
          id: string
          issue_date: string
          observation: string | null
          status: Database['public']['Enums']['demand_item_execution_status']
          supplier_id: string
          updated_at: string
        }
        Insert: {
          bank_order_issued_at?: string | null
          bank_order_number?: string | null
          bank_order_observation?: string | null
          commitment_number: string
          created_at?: string
          created_by?: string | null
          demand_id: string
          disbursement_program_issued_at?: string | null
          disbursement_program_number?: string | null
          disbursement_program_observation?: string | null
          error_details?: string | null
          expense_nature_id?: string | null
          id?: string
          issue_date?: string
          observation?: string | null
          status?: Database['public']['Enums']['demand_item_execution_status']
          supplier_id: string
          updated_at?: string
        }
        Update: {
          bank_order_issued_at?: string | null
          bank_order_number?: string | null
          bank_order_observation?: string | null
          commitment_number?: string
          created_at?: string
          created_by?: string | null
          demand_id?: string
          disbursement_program_issued_at?: string | null
          disbursement_program_number?: string | null
          disbursement_program_observation?: string | null
          error_details?: string | null
          expense_nature_id?: string | null
          id?: string
          issue_date?: string
          observation?: string | null
          status?: Database['public']['Enums']['demand_item_execution_status']
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'demand_commitments_demand_id_fkey'
            columns: ['demand_id']
            referencedRelation: 'demands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demand_commitments_expense_nature_id_fkey'
            columns: ['expense_nature_id']
            referencedRelation: 'expense_natures'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demand_commitments_supplier_id_fkey'
            columns: ['supplier_id']
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      demand_item_status_history: {
        Row: {
          commitment_number: string | null
          created_at: string
          created_by: string | null
          demand_product_id: string
          error_details: string | null
          id: string
          observation: string | null
          status: Database['public']['Enums']['demand_item_execution_status']
        }
        Insert: {
          commitment_number?: string | null
          created_at?: string
          created_by?: string | null
          demand_product_id: string
          error_details?: string | null
          id?: string
          observation?: string | null
          status: Database['public']['Enums']['demand_item_execution_status']
        }
        Update: {
          commitment_number?: string | null
          created_at?: string
          created_by?: string | null
          demand_product_id?: string
          error_details?: string | null
          id?: string
          observation?: string | null
          status?: Database['public']['Enums']['demand_item_execution_status']
        }
        Relationships: [
          {
            foreignKeyName: 'demand_item_status_history_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demand_item_status_history_demand_product_id_fkey'
            columns: ['demand_product_id']
            referencedRelation: 'demand_products'
            referencedColumns: ['id']
          },
        ]
      }
      demand_product_bids: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          demand_product_id: string
          disqualification_reason: string | null
          id: string
          status: Database['public']['Enums']['bid_status']
          supplier_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          demand_product_id: string
          disqualification_reason?: string | null
          id?: string
          status?: Database['public']['Enums']['bid_status']
          supplier_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          demand_product_id?: string
          disqualification_reason?: string | null
          id?: string
          status?: Database['public']['Enums']['bid_status']
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'demand_product_bids_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demand_product_bids_demand_product_id_fkey'
            columns: ['demand_product_id']
            referencedRelation: 'demand_products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demand_product_bids_supplier_id_fkey'
            columns: ['supplier_id']
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      demand_products: {
        Row: {
          alias_code_snapshot: number | null
          alias_id: string | null
          alias_name_snapshot: string | null
          bid_interval: number | null
          bid_interval_type: string | null
          commitment_number: string | null
          created_at: string
          created_by: string | null
          demand_id: string
          execution_error_details: string | null
          execution_status: Database['public']['Enums']['demand_item_execution_status'] | null
          execution_status_updated_at: string | null
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
          alias_code_snapshot?: number | null
          alias_id?: string | null
          alias_name_snapshot?: string | null
          bid_interval?: number | null
          bid_interval_type?: string | null
          commitment_number?: string | null
          created_at?: string
          created_by?: string | null
          demand_id: string
          execution_error_details?: string | null
          execution_status?: Database['public']['Enums']['demand_item_execution_status'] | null
          execution_status_updated_at?: string | null
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
          alias_code_snapshot?: number | null
          alias_id?: string | null
          alias_name_snapshot?: string | null
          bid_interval?: number | null
          bid_interval_type?: string | null
          commitment_number?: string | null
          created_at?: string
          created_by?: string | null
          demand_id?: string
          execution_error_details?: string | null
          execution_status?: Database['public']['Enums']['demand_item_execution_status'] | null
          execution_status_updated_at?: string | null
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
            foreignKeyName: 'demand_products_alias_id_fkey'
            columns: ['alias_id']
            referencedRelation: 'measurement_unit_aliases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demand_products_demand_id_fkey'
            columns: ['demand_id']
            referencedRelation: 'demands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demand_products_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demand_products_unit_id_fkey'
            columns: ['unit_id']
            referencedRelation: 'measurement_units'
            referencedColumns: ['id']
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
            foreignKeyName: 'demand_responsibles_demand_id_fkey'
            columns: ['demand_id']
            referencedRelation: 'demands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demand_responsibles_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      demands: {
        Row: {
          bidding_notice_number: string | null
          contract_number: string | null
          created_at: string
          deleted_at: string | null
          dispute_date: string | null
          dispute_number: string | null
          id: string
          id_pca: string | null
          internal_process_number: string | null
          is_historical: boolean
          is_return_requested: boolean | null
          name: string
          offer_opening_date: string | null
          process_number: string | null
          siafem_number: string | null
          status: Database['public']['Enums']['demand_status']
          type: Database['public']['Enums']['demand_type']
          updated_at: string
          user_id: string
        }
        Insert: {
          bidding_notice_number?: string | null
          contract_number?: string | null
          created_at?: string
          deleted_at?: string | null
          dispute_date?: string | null
          dispute_number?: string | null
          id?: string
          id_pca?: string | null
          internal_process_number?: string | null
          is_historical?: boolean
          is_return_requested?: boolean | null
          name: string
          offer_opening_date?: string | null
          process_number?: string | null
          siafem_number?: string | null
          status?: Database['public']['Enums']['demand_status']
          type: Database['public']['Enums']['demand_type']
          updated_at?: string
          user_id: string
        }
        Update: {
          bidding_notice_number?: string | null
          contract_number?: string | null
          created_at?: string
          deleted_at?: string | null
          dispute_date?: string | null
          dispute_number?: string | null
          id?: string
          id_pca?: string | null
          internal_process_number?: string | null
          is_historical?: boolean
          is_return_requested?: boolean | null
          name?: string
          offer_opening_date?: string | null
          process_number?: string | null
          siafem_number?: string | null
          status?: Database['public']['Enums']['demand_status']
          type?: Database['public']['Enums']['demand_type']
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'demands_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      election_committee_members: {
        Row: {
          created_at: string
          created_by: string | null
          election_id: string
          id: string
          name: string
          role_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          election_id: string
          id?: string
          name: string
          role_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          election_id?: string
          id?: string
          name?: string
          role_name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'election_committee_members_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'election_committee_members_election_id_fkey'
            columns: ['election_id']
            referencedRelation: 'elections'
            referencedColumns: ['id']
          },
        ]
      }
      election_voter_attendance: {
        Row: {
          ballot_box_id: string | null
          created_at: string
          election_id: string
          id: string
          released_by: string | null
          voted_at: string
          voter_id: string | null
          voter_registration_number: string
        }
        Insert: {
          ballot_box_id?: string | null
          created_at?: string
          election_id: string
          id?: string
          released_by?: string | null
          voted_at?: string
          voter_id?: string | null
          voter_registration_number: string
        }
        Update: {
          ballot_box_id?: string | null
          created_at?: string
          election_id?: string
          id?: string
          released_by?: string | null
          voted_at?: string
          voter_id?: string | null
          voter_registration_number?: string
        }
        Relationships: [
          {
            foreignKeyName: 'election_voter_attendance_ballot_box_id_fkey'
            columns: ['ballot_box_id']
            referencedRelation: 'ballot_boxes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'election_voter_attendance_election_id_fkey'
            columns: ['election_id']
            referencedRelation: 'elections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'election_voter_attendance_released_by_fkey'
            columns: ['released_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'election_voter_attendance_voter_id_fkey'
            columns: ['voter_id']
            referencedRelation: 'election_voters'
            referencedColumns: ['id']
          },
        ]
      }
      election_voters: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          voter_registration_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          voter_registration_number: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          voter_registration_number?: string
        }
        Relationships: []
      }
      election_votes: {
        Row: {
          ballot_box_id: string | null
          candidate_id: string | null
          candidate_number: string | null
          created_at: string
          election_id: string
          id: string
          is_blank: boolean
          is_null: boolean
          voter_id: string | null
          voter_name: string | null
          voter_registration_number: string | null
        }
        Insert: {
          ballot_box_id?: string | null
          candidate_id?: string | null
          candidate_number?: string | null
          created_at?: string
          election_id: string
          id?: string
          is_blank?: boolean
          is_null?: boolean
          voter_id?: string | null
          voter_name?: string | null
          voter_registration_number?: string | null
        }
        Update: {
          ballot_box_id?: string | null
          candidate_id?: string | null
          candidate_number?: string | null
          created_at?: string
          election_id?: string
          id?: string
          is_blank?: boolean
          is_null?: boolean
          voter_id?: string | null
          voter_name?: string | null
          voter_registration_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'election_votes_ballot_box_id_fkey'
            columns: ['ballot_box_id']
            referencedRelation: 'ballot_boxes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'election_votes_candidate_id_fkey'
            columns: ['candidate_id']
            referencedRelation: 'candidates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'election_votes_election_id_fkey'
            columns: ['election_id']
            referencedRelation: 'elections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'election_votes_voter_id_fkey'
            columns: ['voter_id']
            referencedRelation: 'election_voters'
            referencedColumns: ['id']
          },
        ]
      }
      elections: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          digits_count: number
          election_date: string
          id: string
          is_anonymous: boolean
          is_uppercase: boolean
          name: string
          status: Database['public']['Enums']['election_status']
          updated_at: string
          voting_mode: Database['public']['Enums']['election_voting_mode']
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          digits_count?: number
          election_date: string
          id?: string
          is_anonymous?: boolean
          is_uppercase?: boolean
          name: string
          status?: Database['public']['Enums']['election_status']
          updated_at?: string
          voting_mode?: Database['public']['Enums']['election_voting_mode']
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          digits_count?: number
          election_date?: string
          id?: string
          is_anonymous?: boolean
          is_uppercase?: boolean
          name?: string
          status?: Database['public']['Enums']['election_status']
          updated_at?: string
          voting_mode?: Database['public']['Enums']['election_voting_mode']
        }
        Relationships: [
          {
            foreignKeyName: 'elections_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
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
          other_document: string | null
          rg: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          other_document?: string | null
          rg?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          other_document?: string | null
          rg?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'iirgd_citizens_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
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
          status: Database['public']['Enums']['iirgd_demand_status']
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          demand_id: string
          id?: string
          observation?: string | null
          status: Database['public']['Enums']['iirgd_demand_status']
        }
        Update: {
          created_at?: string
          created_by?: string | null
          demand_id?: string
          id?: string
          observation?: string | null
          status?: Database['public']['Enums']['iirgd_demand_status']
        }
        Relationships: [
          {
            foreignKeyName: 'iirgd_demand_status_history_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'iirgd_demand_status_history_demand_id_fkey'
            columns: ['demand_id']
            referencedRelation: 'iirgd_demands'
            referencedColumns: ['id']
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
          status: Database['public']['Enums']['iirgd_demand_status']
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
          status?: Database['public']['Enums']['iirgd_demand_status']
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
          status?: Database['public']['Enums']['iirgd_demand_status']
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'iirgd_demands_citizen_id_fkey'
            columns: ['citizen_id']
            referencedRelation: 'iirgd_citizens'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'iirgd_demands_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'iirgd_demands_document_type_id_fkey'
            columns: ['document_type_id']
            referencedRelation: 'iirgd_document_types'
            referencedColumns: ['id']
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
      iirgd_settings: {
        Row: {
          alert_days: number
          delay_days: number
          id: string
          singleton_key: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alert_days?: number
          delay_days?: number
          id?: string
          singleton_key?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alert_days?: number
          delay_days?: number
          id?: string
          singleton_key?: boolean
          updated_at?: string
          updated_by?: string | null
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
            foreignKeyName: 'logs_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      measurement_unit_alias_links: {
        Row: {
          alias_id: string
          created_at: string
          id: string
          unit_id: string
        }
        Insert: {
          alias_id: string
          created_at?: string
          id?: string
          unit_id: string
        }
        Update: {
          alias_id?: string
          created_at?: string
          id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'measurement_unit_alias_links_alias_id_fkey'
            columns: ['alias_id']
            referencedRelation: 'measurement_unit_aliases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'measurement_unit_alias_links_unit_id_fkey'
            columns: ['unit_id']
            referencedRelation: 'measurement_units'
            referencedColumns: ['id']
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
            foreignKeyName: 'measurement_unit_aliases_unit_id_fkey'
            columns: ['unit_id']
            referencedRelation: 'measurement_units'
            referencedColumns: ['id']
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
      product_characteristic_keys: {
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
      product_characteristics: {
        Row: {
          created_at: string
          id: string
          key_id: string
          product_id: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_id: string
          product_id: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key_id?: string
          product_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_characteristics_key_id_fkey'
            columns: ['key_id']
            referencedRelation: 'product_characteristic_keys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_characteristics_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
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
            foreignKeyName: 'product_units_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_units_unit_id_fkey'
            columns: ['unit_id']
            referencedRelation: 'measurement_units'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          cat_bec: number | null
          cat_mat: number | null
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
          cat_bec?: number | null
          cat_mat?: number | null
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
          cat_bec?: number | null
          cat_mat?: number | null
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
            foreignKeyName: 'products_expense_nature_id_fkey'
            columns: ['expense_nature_id']
            referencedRelation: 'expense_natures'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_product_class_id_fkey'
            columns: ['product_class_id']
            referencedRelation: 'product_classes'
            referencedColumns: ['id']
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
          role: Database['public']['Enums']['user_role']
          theme: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          is_active?: boolean
          name?: string | null
          role?: Database['public']['Enums']['user_role']
          theme?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          role?: Database['public']['Enums']['user_role']
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
          email: string | null
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
          email?: string | null
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
          email?: string | null
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
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: 'system_settings_updated_by_fkey'
            columns: ['updated_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_demand_commitments_from_products: {
        Args: never
        Returns: number
      }
      can_read_own_profile: { Args: { profile_id: string }; Returns: boolean }
      can_read_profile_for_history: { Args: never; Returns: boolean }
      generate_system_backup: { Args: never; Returns: Json }
      get_my_current_role: {
        Args: never
        Returns: Database['public']['Enums']['user_role']
      }
      is_admin: { Args: never; Returns: boolean }
      restore_system_backup: { Args: { p_payload: Json }; Returns: Json }
    }
    Enums: {
      bid_status: 'classified' | 'disqualified'
      demand_item_execution_status:
        | 'homologated'
        | 'commitment_issued'
        | 'commitment_sent'
        | 'commitment_confirmed'
        | 'shipped'
        | 'delivered'
        | 'completed'
        | 'error'
      demand_status:
        | 'planning'
        | 'quotation'
        | 'bidding_notice'
        | 'dispute'
        | 'homologation'
        | 'completed'
        | 'cancelled'
      demand_type: 'consumption' | 'permanent'
      election_status: 'awaiting_release' | 'released' | 'tallying' | 'finished'
      election_voting_mode: 'simple' | 'monitored'
      iirgd_demand_status:
        | 'new'
        | 'confronted'
        | 'released'
        | 'issued'
        | 'mailbag'
        | 'cegaf'
        | 'no_data'
        | 'other_pending'
        | 'protocol_cancelled'
        | 'awaiting_collection'
        | 'confrontation_failed'
        | 'unknown_error'
      user_role:
        | 'user'
        | 'admin'
        | 'iirgd_user'
        | 'uge'
        | 'iirgd_manager'
        | 'user-election'
        | 'manager-election'
        | 'admin-election'
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
          type: Database['storage']['Enums']['buckettype']
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
          type?: Database['storage']['Enums']['buckettype']
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
          type?: Database['storage']['Enums']['buckettype']
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
          type: Database['storage']['Enums']['buckettype']
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database['storage']['Enums']['buckettype']
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database['storage']['Enums']['buckettype']
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database['storage']['Enums']['buckettype']
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database['storage']['Enums']['buckettype']
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database['storage']['Enums']['buckettype']
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
            foreignKeyName: 'iceberg_namespaces_catalog_id_fkey'
            columns: ['catalog_id']
            referencedRelation: 'buckets_analytics'
            referencedColumns: ['id']
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
            foreignKeyName: 'iceberg_tables_catalog_id_fkey'
            columns: ['catalog_id']
            referencedRelation: 'buckets_analytics'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'iceberg_tables_namespace_id_fkey'
            columns: ['namespace_id']
            referencedRelation: 'iceberg_namespaces'
            referencedColumns: ['id']
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
            foreignKeyName: 'objects_bucketId_fkey'
            columns: ['bucket_id']
            referencedRelation: 'buckets'
            referencedColumns: ['id']
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
            foreignKeyName: 's3_multipart_uploads_bucket_id_fkey'
            columns: ['bucket_id']
            referencedRelation: 'buckets'
            referencedColumns: ['id']
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
            foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey'
            columns: ['bucket_id']
            referencedRelation: 'buckets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey'
            columns: ['upload_id']
            referencedRelation: 's3_multipart_uploads'
            referencedColumns: ['id']
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
            foreignKeyName: 'vector_indexes_bucket_id_fkey'
            columns: ['bucket_id']
            referencedRelation: 'buckets_vectors'
            referencedColumns: ['id']
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
      buckettype: 'STANDARD' | 'ANALYTICS' | 'VECTOR'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
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
      bid_status: ['classified', 'disqualified'],
      demand_item_execution_status: [
        'homologated',
        'commitment_issued',
        'commitment_sent',
        'commitment_confirmed',
        'shipped',
        'delivered',
        'completed',
        'error',
      ],
      demand_status: [
        'planning',
        'quotation',
        'bidding_notice',
        'dispute',
        'homologation',
        'completed',
        'cancelled',
      ],
      demand_type: ['consumption', 'permanent'],
      election_status: ['awaiting_release', 'released', 'tallying', 'finished'],
      election_voting_mode: ['simple', 'monitored'],
      iirgd_demand_status: [
        'new',
        'confronted',
        'released',
        'issued',
        'mailbag',
        'cegaf',
        'no_data',
        'other_pending',
        'protocol_cancelled',
        'awaiting_collection',
        'confrontation_failed',
        'unknown_error',
      ],
      user_role: [
        'user',
        'admin',
        'iirgd_user',
        'uge',
        'iirgd_manager',
        'user-election',
        'manager-election',
        'admin-election',
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ['STANDARD', 'ANALYTICS', 'VECTOR'],
    },
  },
} as const
