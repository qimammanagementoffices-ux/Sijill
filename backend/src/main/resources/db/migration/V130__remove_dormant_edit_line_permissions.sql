-- These two keys were introduced for UI symmetry, but neither maintenance nor
-- asset requests has an approver-editable line feature. Pre-granting dormant
-- permissions is unsafe: if code later starts enforcing either key, existing
-- holders would gain that new power silently. Remove them until a real feature
-- ships with its own explicit migration and authorization tests.

delete from employee_permission
where permission_key in ('mt.act.edit.lines', 'as.act.edit.lines');

delete from permission
where key in ('mt.act.edit.lines', 'as.act.edit.lines');

delete from translation
where key in ('permission.mt_act_edit_lines', 'permission.as_act_edit_lines');
