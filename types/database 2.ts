export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      app_health: {
        Row: {
          id: number;
          message: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          id: number;
          message: string;
          status: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          message?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attempts: {
        Row: {
          created_at: string;
          error_tags: string[];
          feedback: string;
          hint: string | null;
          id: string;
          sentence_id: string;
          user_id: string;
          user_translation: string;
          verdict: Database["public"]["Enums"]["translation_verdict"];
        };
        Insert: {
          created_at?: string;
          error_tags?: string[];
          feedback?: string;
          hint?: string | null;
          id?: string;
          sentence_id: string;
          user_id: string;
          user_translation: string;
          verdict: Database["public"]["Enums"]["translation_verdict"];
        };
        Update: {
          created_at?: string;
          error_tags?: string[];
          feedback?: string;
          hint?: string | null;
          id?: string;
          sentence_id?: string;
          user_id?: string;
          user_translation?: string;
          verdict?: Database["public"]["Enums"]["translation_verdict"];
        };
        Relationships: [
          {
            foreignKeyName: "attempts_sentence_id_fkey";
            columns: ["sentence_id"];
            isOneToOne: false;
            referencedRelation: "sentences";
            referencedColumns: ["id"];
          },
        ];
      };
      battle_answers: {
        Row: {
          battle_id: string;
          created_at: string;
          points: number;
          sentence_index: number;
          translation: string;
          user_id: string;
          verdict: Database["public"]["Enums"]["translation_verdict"];
        };
        Insert: {
          battle_id: string;
          created_at?: string;
          points: number;
          sentence_index: number;
          translation: string;
          user_id: string;
          verdict: Database["public"]["Enums"]["translation_verdict"];
        };
        Update: {
          battle_id?: string;
          created_at?: string;
          points?: number;
          sentence_index?: number;
          translation?: string;
          user_id?: string;
          verdict?: Database["public"]["Enums"]["translation_verdict"];
        };
        Relationships: [
          {
            foreignKeyName: "battle_answers_battle_id_fkey";
            columns: ["battle_id"];
            isOneToOne: false;
            referencedRelation: "battles";
            referencedColumns: ["id"];
          },
        ];
      };
      battle_players: {
        Row: {
          answered: number;
          battle_id: string;
          finished_at: string | null;
          score: number;
          user_id: string;
        };
        Insert: {
          answered?: number;
          battle_id: string;
          finished_at?: string | null;
          score?: number;
          user_id: string;
        };
        Update: {
          answered?: number;
          battle_id?: string;
          finished_at?: string | null;
          score?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "battle_players_battle_id_fkey";
            columns: ["battle_id"];
            isOneToOne: false;
            referencedRelation: "battles";
            referencedColumns: ["id"];
          },
        ];
      };
      battles: {
        Row: {
          created_at: string;
          created_by: string;
          finished_at: string | null;
          id: string;
          language: Database["public"]["Enums"]["learning_language"];
          level: Database["public"]["Enums"]["proficiency_level"];
          sentences: string[];
          started_at: string | null;
          status: Database["public"]["Enums"]["battle_status"];
          winner_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          finished_at?: string | null;
          id?: string;
          language: Database["public"]["Enums"]["learning_language"];
          level: Database["public"]["Enums"]["proficiency_level"];
          sentences: string[];
          started_at?: string | null;
          status?: Database["public"]["Enums"]["battle_status"];
          winner_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          finished_at?: string | null;
          id?: string;
          language?: Database["public"]["Enums"]["learning_language"];
          level?: Database["public"]["Enums"]["proficiency_level"];
          sentences?: string[];
          started_at?: string | null;
          status?: Database["public"]["Enums"]["battle_status"];
          winner_id?: string | null;
        };
        Relationships: [];
      };
      cloze_sets: {
        Row: {
          blanks: Json;
          created_at: string;
          id: string;
          lesson_id: string;
          level: Database["public"]["Enums"]["proficiency_level"];
          user_id: string;
        };
        Insert: {
          blanks?: Json;
          created_at?: string;
          id?: string;
          lesson_id: string;
          level: Database["public"]["Enums"]["proficiency_level"];
          user_id: string;
        };
        Update: {
          blanks?: Json;
          created_at?: string;
          id?: string;
          lesson_id?: string;
          level?: Database["public"]["Enums"]["proficiency_level"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cloze_sets_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      dictionary_entries: {
        Row: {
          common: boolean;
          id: string;
          kana: string[];
          kanji: string[];
          senses: Json;
        };
        Insert: {
          common?: boolean;
          id: string;
          kana?: string[];
          kanji?: string[];
          senses?: Json;
        };
        Update: {
          common?: boolean;
          id?: string;
          kana?: string[];
          kanji?: string[];
          senses?: Json;
        };
        Relationships: [];
      };
      error_logs: {
        Row: {
          attempt_id: string;
          created_at: string;
          id: string;
          tag: string;
          user_id: string;
        };
        Insert: {
          attempt_id: string;
          created_at?: string;
          id?: string;
          tag: string;
          user_id: string;
        };
        Update: {
          attempt_id?: string;
          created_at?: string;
          id?: string;
          tag?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "error_logs_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
        ];
      };
      flashcards: {
        Row: {
          created_at: string;
          due_date: string;
          ease: number;
          id: string;
          interval_days: number;
          lapses: number;
          last_reviewed_at: string | null;
          repetitions: number;
          user_id: string;
          vocab_item_id: string;
        };
        Insert: {
          created_at?: string;
          due_date?: string;
          ease?: number;
          id?: string;
          interval_days?: number;
          lapses?: number;
          last_reviewed_at?: string | null;
          repetitions?: number;
          user_id: string;
          vocab_item_id: string;
        };
        Update: {
          created_at?: string;
          due_date?: string;
          ease?: number;
          id?: string;
          interval_days?: number;
          lapses?: number;
          last_reviewed_at?: string | null;
          repetitions?: number;
          user_id?: string;
          vocab_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcards_vocab_item_id_fkey";
            columns: ["vocab_item_id"];
            isOneToOne: true;
            referencedRelation: "vocab_items";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          language: Database["public"]["Enums"]["learning_language"];
          level: Database["public"]["Enums"]["proficiency_level"];
          source: Database["public"]["Enums"]["lesson_source"];
          source_license: string | null;
          source_name: string | null;
          source_url: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          language: Database["public"]["Enums"]["learning_language"];
          level: Database["public"]["Enums"]["proficiency_level"];
          source?: Database["public"]["Enums"]["lesson_source"];
          source_license?: string | null;
          source_name?: string | null;
          source_url?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          language?: Database["public"]["Enums"]["learning_language"];
          level?: Database["public"]["Enums"]["proficiency_level"];
          source?: Database["public"]["Enums"]["lesson_source"];
          source_license?: string | null;
          source_name?: string | null;
          source_url?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      news_rewrites: {
        Row: {
          created_at: string;
          level: Database["public"]["Enums"]["proficiency_level"];
          passage: string;
          prompt_version: string;
          source_url: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          level: Database["public"]["Enums"]["proficiency_level"];
          passage: string;
          prompt_version: string;
          source_url: string;
          title: string;
        };
        Update: {
          created_at?: string;
          level?: Database["public"]["Enums"]["proficiency_level"];
          passage?: string;
          prompt_version?: string;
          source_url?: string;
          title?: string;
        };
        Relationships: [];
      };
      pomodoro_sessions: {
        Row: {
          created_at: string;
          ended_at: string | null;
          id: string;
          planned_minutes: number;
          started_at: string;
          status: Database["public"]["Enums"]["pomodoro_status"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          planned_minutes?: number;
          started_at?: string;
          status?: Database["public"]["Enums"]["pomodoro_status"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          planned_minutes?: number;
          started_at?: string;
          status?: Database["public"]["Enums"]["pomodoro_status"];
          user_id?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          created_at: string;
          id: string;
          language: Database["public"]["Enums"]["learning_language"];
          lesson_id: string | null;
          pairs: Json;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          language: Database["public"]["Enums"]["learning_language"];
          lesson_id?: string | null;
          pairs: Json;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          language?: Database["public"]["Enums"]["learning_language"];
          lesson_id?: string | null;
          pairs?: Json;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          accent: string | null;
          avatar_path: string | null;
          created_at: string;
          display_language: Database["public"]["Enums"]["display_language"];
          display_name: string | null;
          learning_language: Database["public"]["Enums"]["learning_language"] | null;
          level: Database["public"]["Enums"]["proficiency_level"] | null;
          onboarded_at: string | null;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accent?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          display_language?: Database["public"]["Enums"]["display_language"];
          display_name?: string | null;
          learning_language?: Database["public"]["Enums"]["learning_language"] | null;
          level?: Database["public"]["Enums"]["proficiency_level"] | null;
          onboarded_at?: string | null;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accent?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          display_language?: Database["public"]["Enums"]["display_language"];
          display_name?: string | null;
          learning_language?: Database["public"]["Enums"]["learning_language"] | null;
          level?: Database["public"]["Enums"]["proficiency_level"] | null;
          onboarded_at?: string | null;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_accent_fkey";
            columns: ["accent"];
            isOneToOne: false;
            referencedRelation: "shop_items";
            referencedColumns: ["id"];
          },
        ];
      };
      purchases: {
        Row: {
          created_at: string;
          item_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          item_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          item_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "shop_items";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          bucket: string;
          count: number;
          key: string;
          user_id: string;
        };
        Insert: {
          bucket: string;
          count?: number;
          key: string;
          user_id: string;
        };
        Update: {
          bucket?: string;
          count?: number;
          key?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          post_id: string;
          reason: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          reason: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          reason?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      sentences: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          lesson_id: string;
          position: number;
          reference_translation: string | null;
          source_text: string;
          tokens: Json | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          lesson_id: string;
          position: number;
          reference_translation?: string | null;
          source_text: string;
          tokens?: Json | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          lesson_id?: string;
          position?: number;
          reference_translation?: string | null;
          source_text?: string;
          tokens?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sentences_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_items: {
        Row: {
          id: string;
          kind: Database["public"]["Enums"]["shop_item_kind"];
          price: number;
          sort_order: number;
        };
        Insert: {
          id: string;
          kind: Database["public"]["Enums"]["shop_item_kind"];
          price: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          kind?: Database["public"]["Enums"]["shop_item_kind"];
          price?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          coins_delta: number;
          created_at: string;
          id: string;
          idempotency_key: string;
          metadata: Json;
          reason: string;
          user_id: string;
          xp_delta: number;
        };
        Insert: {
          coins_delta?: number;
          created_at?: string;
          id?: string;
          idempotency_key: string;
          metadata?: Json;
          reason: string;
          user_id: string;
          xp_delta?: number;
        };
        Update: {
          coins_delta?: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string;
          metadata?: Json;
          reason?: string;
          user_id?: string;
          xp_delta?: number;
        };
        Relationships: [];
      };
      vocab_items: {
        Row: {
          context_sentence: string | null;
          context_translation: string | null;
          created_at: string;
          id: string;
          language: Database["public"]["Enums"]["learning_language"];
          meaning: string;
          part_of_speech: string | null;
          reading: string | null;
          sentence_id: string | null;
          term: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          context_sentence?: string | null;
          context_translation?: string | null;
          created_at?: string;
          id?: string;
          language: Database["public"]["Enums"]["learning_language"];
          meaning?: string;
          part_of_speech?: string | null;
          reading?: string | null;
          sentence_id?: string | null;
          term: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          context_sentence?: string | null;
          context_translation?: string | null;
          created_at?: string;
          id?: string;
          language?: Database["public"]["Enums"]["learning_language"];
          meaning?: string;
          part_of_speech?: string | null;
          reading?: string | null;
          sentence_id?: string | null;
          term?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vocab_items_sentence_id_fkey";
            columns: ["sentence_id"];
            isOneToOne: false;
            referencedRelation: "sentences";
            referencedColumns: ["id"];
          },
        ];
      };
      wallets: {
        Row: {
          coins: number;
          created_at: string;
          last_active_date: string | null;
          streak_best: number;
          streak_current: number;
          updated_at: string;
          user_id: string;
          xp: number;
        };
        Insert: {
          coins?: number;
          created_at?: string;
          last_active_date?: string | null;
          streak_best?: number;
          streak_current?: number;
          updated_at?: string;
          user_id: string;
          xp?: number;
        };
        Update: {
          coins?: number;
          created_at?: string;
          last_active_date?: string | null;
          streak_best?: number;
          streak_current?: number;
          updated_at?: string;
          user_id?: string;
          xp?: number;
        };
        Relationships: [];
      };
      word_explanations: {
        Row: {
          created_at: string;
          display_language: Database["public"]["Enums"]["display_language"];
          id: string;
          language: Database["public"]["Enums"]["learning_language"];
          meaning: string;
          note: string | null;
          part_of_speech: string | null;
          reading: string;
          term: string;
        };
        Insert: {
          created_at?: string;
          display_language: Database["public"]["Enums"]["display_language"];
          id?: string;
          language: Database["public"]["Enums"]["learning_language"];
          meaning: string;
          note?: string | null;
          part_of_speech?: string | null;
          reading?: string;
          term: string;
        };
        Update: {
          created_at?: string;
          display_language?: Database["public"]["Enums"]["display_language"];
          id?: string;
          language?: Database["public"]["Enums"]["learning_language"];
          meaning?: string;
          note?: string | null;
          part_of_speech?: string | null;
          reading?: string;
          term?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      profile_cards: {
        Row: {
          avatar_path: string | null;
          display_name: string | null;
          user_id: string | null;
        };
        Insert: {
          avatar_path?: string | null;
          display_name?: string | null;
          user_id?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          display_name?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      abandon_pomodoro: { Args: { p_session_id: string }; Returns: undefined };
      buy_item: { Args: { p_item_id: string }; Returns: number };
      complete_pomodoro: { Args: { p_session_id: string }; Returns: number };
      create_lesson: {
        Args: {
          p_language: Database["public"]["Enums"]["learning_language"];
          p_level: Database["public"]["Enums"]["proficiency_level"];
          p_sentences: string[];
          p_source?: Database["public"]["Enums"]["lesson_source"];
          p_source_license?: string;
          p_source_name?: string;
          p_source_url?: string;
          p_title: string;
        };
        Returns: string;
      };
      is_battle_player: { Args: { p_battle_id: string }; Returns: boolean };
      join_battle: {
        Args: {
          p_language: Database["public"]["Enums"]["learning_language"];
          p_level: Database["public"]["Enums"]["proficiency_level"];
          p_sentences: string[];
        };
        Returns: string;
      };
      leaderboard: {
        Args: { p_metric: string; p_period: string };
        Returns: {
          avatar_path: string;
          display_name: string;
          rank: number;
          user_id: string;
          value: number;
        }[];
      };
      leave_battle: { Args: { p_battle_id: string }; Returns: undefined };
      level_matches_language: {
        Args: {
          lang: Database["public"]["Enums"]["learning_language"];
          lvl: Database["public"]["Enums"]["proficiency_level"];
        };
        Returns: boolean;
      };
      pomodoro_reward_coins: { Args: { p_minutes: number }; Returns: number };
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number };
        Returns: boolean;
      };
      start_pomodoro: {
        Args: { p_planned_minutes?: number };
        Returns: {
          created_at: string;
          ended_at: string | null;
          id: string;
          planned_minutes: number;
          started_at: string;
          status: Database["public"]["Enums"]["pomodoro_status"];
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "pomodoro_sessions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      wallet_apply: {
        Args: {
          p_coins_delta: number;
          p_idempotency_key: string;
          p_metadata?: Json;
          p_reason: string;
          p_user_id: string;
          p_xp_delta: number;
        };
        Returns: boolean;
      };
    };
    Enums: {
      battle_status: "waiting" | "active" | "finished" | "cancelled";
      display_language: "vi" | "en" | "ja";
      learning_language: "ja" | "en";
      lesson_source: "manual" | "ai" | "news";
      pomodoro_status: "running" | "completed" | "abandoned";
      proficiency_level: "N5" | "N4" | "N3" | "N2" | "N1" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
      shop_item_kind: "theme" | "decoration" | "topic_pack";
      translation_verdict: "exact" | "acceptable" | "incorrect";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      battle_status: ["waiting", "active", "finished", "cancelled"],
      display_language: ["vi", "en", "ja"],
      learning_language: ["ja", "en"],
      lesson_source: ["manual", "ai", "news"],
      pomodoro_status: ["running", "completed", "abandoned"],
      proficiency_level: ["N5", "N4", "N3", "N2", "N1", "A1", "A2", "B1", "B2", "C1", "C2"],
      shop_item_kind: ["theme", "decoration", "topic_pack"],
      translation_verdict: ["exact", "acceptable", "incorrect"],
    },
  },
} as const;
