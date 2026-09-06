export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: "owner" | "teacher";
  phone: string | null;
  is_active: boolean;
  /** Login identifier for accounts without a real email (most teachers). Null for email-based accounts. */
  username: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DepartmentAssignment {
  id: string;
  user_id: string;
  department_id: string;
  created_at: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface SchoolSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  /** Generated column - order-independent pairing of sender/recipient user_ids. Read-only. */
  thread_key: string;
  /** Shared across every recipient copy of one owner broadcast action. */
  broadcast_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
}
