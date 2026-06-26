-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES new_users(id),
    target_user_id UUID REFERENCES new_users(id),
    event_type VARCHAR(255) NOT NULL,
    action_details JSONB,
    ip_address VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit logs
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM new_users WHERE new_users.id = auth.uid() AND new_users.role = 'admin'));

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM new_users WHERE new_users.id = auth.uid() AND new_users.role = 'admin'));

-- Update announcements table to support different types if missing
-- Assuming cohort_announcements exists, let's create a generic announcements table or modify cohort_announcements
-- Let's create a generic platform_announcements table just in case
CREATE TABLE IF NOT EXISTS platform_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'platform', -- platform, cohort, sprint
    cycle_id UUID REFERENCES cycles(id),
    sprint_id UUID REFERENCES sprints(id),
    pinned BOOLEAN DEFAULT false,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES new_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for platform_announcements
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can read platform_announcements
CREATE POLICY "Anyone can read platform_announcements"
    ON platform_announcements FOR SELECT
    USING (true);

-- Admins can manage platform_announcements
CREATE POLICY "Admins can manage platform_announcements"
    ON platform_announcements FOR ALL
    USING (EXISTS (SELECT 1 FROM new_users WHERE new_users.id = auth.uid() AND new_users.role = 'admin'));

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL, -- PDF, Video, Documentation, Website, GitHub
    url VARCHAR(1024) NOT NULL,
    domain_id UUID REFERENCES domains(id),
    cycle_id UUID REFERENCES cycles(id),
    sprint_id UUID REFERENCES sprints(id),
    task_id UUID REFERENCES tasks(id),
    created_by UUID REFERENCES new_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for resources
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Anyone can read resources
CREATE POLICY "Anyone can read resources"
    ON resources FOR SELECT
    USING (true);

-- Admins can manage resources
CREATE POLICY "Admins can manage resources"
    ON resources FOR ALL
    USING (EXISTS (SELECT 1 FROM new_users WHERE new_users.id = auth.uid() AND new_users.role = 'admin'));
