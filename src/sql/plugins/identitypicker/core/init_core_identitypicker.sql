-- liquibase formatted sql
-- changeset lutece-global-pom:init_core_identitypicker.sql
-- preconditions onFail:MARK_RAN onError:WARN

--
-- RBAC : grant all IDENTITYPICKER permissions to the super administrator role.
-- In Lutece 8 the RBAC service no longer bypasses authorization for the super admin
-- (unlike v7), so the permissions must be granted explicitly for the picker to be usable
-- out of the box. Other roles can still be granted specific permissions via the BO.
--
DELETE FROM core_admin_role_resource WHERE role_key = 'super_admin' AND resource_type = 'IDENTITYPICKER';
INSERT INTO core_admin_role_resource (role_key, resource_type, resource_id, permission) VALUES
('super_admin', 'IDENTITYPICKER', '*', '*');
