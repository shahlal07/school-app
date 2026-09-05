-- Seed data. Confidence levels are deliberately different across parts of
-- this migration and that is intentional, not an oversight:
--   - Classes/sections/subjects per grade: confident (general Punjab
--     school curriculum structure, PG through 10th).
--   - Chapters for Physics/Chemistry/Biology/Mathematics in 9th/10th:
--     confident (Punjab Textbook Board's chapter sequence for these is
--     long-stable and well documented).
--   - Chapters for every other subject/grade (English, Urdu, Islamiat,
--     Pakistan Studies, Computer Science, and ALL of PG-8): deliberately
--     left empty. Fabricating specific chapter titles here would be the
--     same false-confidence problem already caught twice in this
--     project's AI-drafted work - the owner/teachers add these through
--     the syllabus manager, or a dedicated follow-up content pass.
-- Everything here is owner-editable via the syllabus manager; nothing is
-- hard-coded into the frontend.

insert into public.academic_years (name, start_date, end_date, is_active)
values ('2025-2026', '2025-04-01', '2026-03-31', true);

with year as (
  select id from public.academic_years where name = '2025-2026'
)
insert into public.classes (name, grade, group_name, academic_year_id)
select v.name, v.name, v.group_name, year.id
from year, (values
  ('PG', null),
  ('Nursery', null),
  ('Prep', null),
  ('1', null),
  ('2', null),
  ('3', null),
  ('4', null),
  ('5', null),
  ('6', null),
  ('7', null),
  ('8', null),
  ('9', 'science'),
  ('10', 'science')
) as v(name, group_name);

insert into public.sections (class_id, name)
select id, 'A' from public.classes;

-- Subjects per grade band.
insert into public.subjects (class_id, name, group_name)
select c.id, v.name, c.group_name
from public.classes c
join (values
  ('PG', 'English'), ('PG', 'Urdu'), ('PG', 'Mathematics'), ('PG', 'General Knowledge'),
  ('Nursery', 'English'), ('Nursery', 'Urdu'), ('Nursery', 'Mathematics'), ('Nursery', 'General Knowledge'),
  ('Prep', 'English'), ('Prep', 'Urdu'), ('Prep', 'Mathematics'), ('Prep', 'General Knowledge'), ('Prep', 'Islamiat'),
  ('1', 'Urdu'), ('1', 'English'), ('1', 'Mathematics'), ('1', 'Islamiat'), ('1', 'General Knowledge'),
  ('2', 'Urdu'), ('2', 'English'), ('2', 'Mathematics'), ('2', 'Islamiat'), ('2', 'General Knowledge'),
  ('3', 'Urdu'), ('3', 'English'), ('3', 'Mathematics'), ('3', 'Science'), ('3', 'Islamiat'), ('3', 'Social Studies'),
  ('4', 'Urdu'), ('4', 'English'), ('4', 'Mathematics'), ('4', 'Science'), ('4', 'Islamiat'), ('4', 'Social Studies'),
  ('5', 'Urdu'), ('5', 'English'), ('5', 'Mathematics'), ('5', 'Science'), ('5', 'Islamiat'), ('5', 'Social Studies'),
  ('6', 'Urdu'), ('6', 'English'), ('6', 'Mathematics'), ('6', 'Science'), ('6', 'Islamiat'), ('6', 'Social Studies'), ('6', 'Computer Science'),
  ('7', 'Urdu'), ('7', 'English'), ('7', 'Mathematics'), ('7', 'Science'), ('7', 'Islamiat'), ('7', 'Social Studies'), ('7', 'Computer Science'),
  ('8', 'Urdu'), ('8', 'English'), ('8', 'Mathematics'), ('8', 'Science'), ('8', 'Islamiat'), ('8', 'Social Studies'), ('8', 'Computer Science'),
  ('9', 'Physics'), ('9', 'Chemistry'), ('9', 'Biology'), ('9', 'Mathematics'), ('9', 'English'), ('9', 'Urdu'), ('9', 'Islamiat'), ('9', 'Pakistan Studies'), ('9', 'Computer Science'),
  ('10', 'Physics'), ('10', 'Chemistry'), ('10', 'Biology'), ('10', 'Mathematics'), ('10', 'English'), ('10', 'Urdu'), ('10', 'Islamiat'), ('10', 'Pakistan Studies'), ('10', 'Computer Science')
) as v(class_name, name) on c.name = v.class_name;

-- ---------------------------------------------------------------------
-- Chapters + one topic per chapter (Physics/Chemistry/Biology/
-- Mathematics, 9th and 10th only - see confidence note above).
-- ---------------------------------------------------------------------

with chapter_seed as (
  insert into public.chapters (subject_id, name, order_index)
  select s.id, v.chapter_name, v.order_index
  from public.subjects s
  join public.classes c on c.id = s.class_id
  join (values
    ('9', 'Physics', 1, 'Physical Quantities and Measurement'),
    ('9', 'Physics', 2, 'Kinematics'),
    ('9', 'Physics', 3, 'Dynamics'),
    ('9', 'Physics', 4, 'Turning Effect of Forces'),
    ('9', 'Physics', 5, 'Gravitation'),
    ('9', 'Physics', 6, 'Work and Energy'),
    ('9', 'Physics', 7, 'Properties of Matter'),
    ('9', 'Physics', 8, 'Thermal Properties of Matter'),
    ('9', 'Physics', 9, 'Transfer of Heat'),
    ('10', 'Physics', 10, 'Simple Harmonic Motion and Waves'),
    ('10', 'Physics', 11, 'Sound'),
    ('10', 'Physics', 12, 'Geometrical Optics'),
    ('10', 'Physics', 13, 'Electrostatics'),
    ('10', 'Physics', 14, 'Current Electricity'),
    ('10', 'Physics', 15, 'Electromagnetism'),
    ('10', 'Physics', 16, 'Basic Electronics'),
    ('10', 'Physics', 17, 'Information and Communication Technology'),
    ('10', 'Physics', 18, 'Atomic and Nuclear Physics'),

    ('9', 'Chemistry', 1, 'Fundamentals of Chemistry'),
    ('9', 'Chemistry', 2, 'Structure of Atoms'),
    ('9', 'Chemistry', 3, 'Periodic Table and Periodicity of Properties'),
    ('9', 'Chemistry', 4, 'Structure of Molecules'),
    ('9', 'Chemistry', 5, 'Physical States of Matter'),
    ('9', 'Chemistry', 6, 'Solutions'),
    ('9', 'Chemistry', 7, 'Electrochemistry'),
    ('9', 'Chemistry', 8, 'Chemical Reactivity'),
    ('10', 'Chemistry', 9, 'Chemical Equilibrium'),
    ('10', 'Chemistry', 10, 'Acids, Bases and Salts'),
    ('10', 'Chemistry', 11, 'Organic Chemistry'),
    ('10', 'Chemistry', 12, 'Hydrocarbons'),
    ('10', 'Chemistry', 13, 'Biochemistry'),
    ('10', 'Chemistry', 14, 'The Atmosphere'),
    ('10', 'Chemistry', 15, 'Water'),
    ('10', 'Chemistry', 16, 'Chemical Industries'),

    ('9', 'Biology', 1, 'Introduction to Biology'),
    ('9', 'Biology', 2, 'Solving a Biological Problem'),
    ('9', 'Biology', 3, 'Biodiversity'),
    ('9', 'Biology', 4, 'Cell Structure and Function'),
    ('9', 'Biology', 5, 'Cells to Tissues'),
    ('9', 'Biology', 6, 'Bioenergetics'),
    ('9', 'Biology', 7, 'Nutrition'),
    ('9', 'Biology', 8, 'Transport'),
    ('9', 'Biology', 9, 'Gaseous Exchange'),
    ('9', 'Biology', 10, 'Homeostasis'),
    ('9', 'Biology', 11, 'Support and Movement'),
    ('9', 'Biology', 12, 'Coordination and Control'),
    ('10', 'Biology', 13, 'Reproduction'),
    ('10', 'Biology', 14, 'Inheritance'),
    ('10', 'Biology', 15, 'Evolution'),
    ('10', 'Biology', 16, 'Biotechnology'),
    ('10', 'Biology', 17, 'Man and His Environment'),
    ('10', 'Biology', 18, 'Pharmacology'),

    ('9', 'Mathematics', 1, 'Matrices and Determinants'),
    ('9', 'Mathematics', 2, 'Real and Complex Numbers'),
    ('9', 'Mathematics', 3, 'Logarithms'),
    ('9', 'Mathematics', 4, 'Algebraic Expressions and Algebraic Formulas'),
    ('9', 'Mathematics', 5, 'Factorization'),
    ('9', 'Mathematics', 6, 'Algebraic Manipulation'),
    ('9', 'Mathematics', 7, 'Linear Equations and Inequalities'),
    ('9', 'Mathematics', 8, 'Linear Graphs and Their Application'),
    ('9', 'Mathematics', 9, 'Introduction to Coordinate Geometry'),
    ('9', 'Mathematics', 10, 'Congruent Triangles'),
    ('9', 'Mathematics', 11, 'Parallelograms and Triangles'),
    ('9', 'Mathematics', 12, 'Line Bisectors and Angle Bisectors'),
    ('9', 'Mathematics', 13, 'Sides and Angles of a Triangle'),
    ('9', 'Mathematics', 14, 'Ratio and Proportion'),
    ('9', 'Mathematics', 15, 'Pythagoras'' Theorem'),
    ('9', 'Mathematics', 16, 'Theorems Related with Area'),
    ('9', 'Mathematics', 17, 'Practical Geometry - Triangles'),
    ('10', 'Mathematics', 18, 'Quadratic Equations'),
    ('10', 'Mathematics', 19, 'Theory of Quadratic Equations'),
    ('10', 'Mathematics', 20, 'Variations'),
    ('10', 'Mathematics', 21, 'Partial Fractions'),
    ('10', 'Mathematics', 22, 'Sets and Functions'),
    ('10', 'Mathematics', 23, 'Basic Statistics'),
    ('10', 'Mathematics', 24, 'Introduction to Trigonometry'),
    ('10', 'Mathematics', 25, 'Projection of a Side of a Triangle'),
    ('10', 'Mathematics', 26, 'Chords of a Circle'),
    ('10', 'Mathematics', 27, 'Tangent to a Circle'),
    ('10', 'Mathematics', 28, 'Chords and Arcs'),
    ('10', 'Mathematics', 29, 'Angle in a Segment of a Circle'),
    ('10', 'Mathematics', 30, 'Practical Geometry - Circles')
  ) as v(class_name, subject_name, order_index, chapter_name)
    on c.name = v.class_name and s.name = v.subject_name
  returning id, name
)
insert into public.topics (chapter_id, name, order_index)
select id, name, 1 from chapter_seed;
