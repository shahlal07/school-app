export interface Class {
  id: string;
  name: string;
  grade: string;
  group: string;
  academic_year_id: string;
}

export interface Section {
  id: string;
  class_id: string;
  name: string;
}

export interface Student {
  id: string;
  class_id: string;
  section_id: string;
  roll_no: string;
  name: string;
  is_active: boolean;
}

export interface Subject {
  id: string;
  class_id: string;
  name: string;
  code: string;
  group: string;
  is_active: boolean;
}

export interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
}

export interface Chapter {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  order_index: number;
}

export interface Topic {
  id: string;
  chapter_id: string;
  name: string;
  description: string | null;
  order_index: number;
}
