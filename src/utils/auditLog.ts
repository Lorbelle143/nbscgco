import { supabase } from '../lib/supabase';

export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'export' | 'print';

export async function logAudit(
  action: AuditAction,
  entity: string,
  entityId: string,
  details: string,
  performedBy?: string
) {
  try {
    await supabase.from('audit_logs').insert({
      action,
      entity,
      entity_id: entityId,
      // also populate old column names in case DB hasn't been migrated yet
      table_name: entity,
      record_id: entityId,
      details,
      performed_by: performedBy || 'admin',
      performed_at: new Date().toISOString(),
    });
  } catch {
    // Silently fail — audit log should never break the main flow
  }
}
