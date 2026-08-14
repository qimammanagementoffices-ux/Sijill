ALTER TABLE department
    ADD COLUMN IF NOT EXISTS parent_department_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_department_parent'
          AND conrelid = 'department'::regclass
    ) THEN
        ALTER TABLE department
            ADD CONSTRAINT fk_department_parent
            FOREIGN KEY (parent_department_id)
            REFERENCES department(id)
            ON DELETE RESTRICT;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_department_parent
    ON department(parent_department_id);
