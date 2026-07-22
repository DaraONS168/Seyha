const CRUD_ACTIONS = [
  { action: 'view', label: 'មើល' },
  { action: 'create', label: 'បង្កើត' },
  { action: 'update', label: 'កែប្រែ' },
  { action: 'delete', label: 'លុប' },
]

export const PERMISSION_MODULES = [
  { key: 'dashboard', label: 'ផ្ទាំងគ្រប់គ្រង', group: 'ទូទៅ' },
  { key: 'notifications', label: 'ការជូនដំណឹង', group: 'ទូទៅ' },
  { key: 'customers', label: 'អតិថិជន', group: 'ការងារលក់' },
  { key: 'follow_ups', label: 'Follow Up', group: 'ការងារលក់' },
  { key: 'visit_plans', label: 'ផែនការចុះស្រុក', group: 'ការងារលក់' },
  { key: 'calls', label: 'ប្រវត្តិការហៅ', group: 'ការងារលក់' },
  { key: 'reports', label: 'របាយការណ៍', group: 'ការគ្រប់គ្រង' },
  { key: 'sales_team', label: 'ក្រុមលក់', group: 'ការគ្រប់គ្រង' },
  { key: 'markets', label: 'ព័ត៌មានផ្សារ', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'expenses', label: 'សំណើចំណាយ', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'expenses.budgets', label: 'ថវិកាខេត្ត', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'fuel', label: 'ចំណាយសាំង', group: 'ចំណាយសាំង' },
  { key: 'fuel.budgets', label: 'ថវិកាសាំង', group: 'ចំណាយសាំង' },
  { key: 'vehicles', label: 'យានយន្ត', group: 'ចំណាយសាំង' },
  { key: 'users', label: 'អ្នកប្រើប្រាស់ និង Roles', group: 'ប្រព័ន្ធ' },
  { key: 'settings', label: 'ការកំណត់ប្រព័ន្ធ', group: 'ប្រព័ន្ធ' },
]

const crudPermissions = PERMISSION_MODULES.flatMap(module => CRUD_ACTIONS.map(({ action, label }) => ({
  key: `${module.key}.${action}`,
  label: `${label}${module.label}`,
  group: module.group,
  description: `${label}ទិន្នន័យក្នុងផ្នែក${module.label}`,
})))

const WORKFLOW_PERMISSIONS = [
  { key: 'markets.restore', label: 'Restore ផ្សារ', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'markets.import', label: 'Import ទិន្នន័យផ្សារ', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'markets.export', label: 'Export ទិន្នន័យផ្សារ', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'markets.view_audit', label: 'មើល Audit Log ផ្សារ', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'expenses.submit', label: 'ដាក់ស្នើចំណាយ', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'expenses.approve', label: 'អនុម័ត/បដិសេធសំណើ', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'expenses.pay', label: 'កត់ត្រាការទូទាត់', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'expenses.actual', label: 'កត់ត្រាចំណាយជាក់ស្តែង', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'expenses.complete', label: 'ផ្ទៀងផ្ទាត់ និងបិទបញ្ជី', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'expenses.reopen', label: 'បើកបញ្ជីឡើងវិញ', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'expenses.override_limit', label: 'អនុញ្ញាតចំណាយលើសកម្រិត', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'expenses.audit', label: 'មើល Audit Log ចំណាយ', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'expenses.reports', label: 'របាយការណ៍ចំណាយ', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'expenses.budgets.revise', label: 'កែសម្រួលថវិកា', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'expenses.fiscal_lock', label: 'បិទ/បើកឆ្នាំថវិកា', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'expenses.verify', label: 'ផ្ទៀងផ្ទាត់បញ្ជីចំណាយ', group: 'គ្រប់គ្រងចំណាយ' },
  { key: 'fuel.submit', label: 'ដាក់ស្នើចំណាយសាំង', group: 'ចំណាយសាំង' },
  { key: 'fuel.approve', label: 'អនុម័តចំណាយសាំង', group: 'ចំណាយសាំង' },
  { key: 'fuel.reports', label: 'របាយការណ៍ចំណាយសាំង', group: 'ចំណាយសាំង' },
]

export const PERMISSIONS = [...crudPermissions, ...WORKFLOW_PERMISSIONS]

const moduleCrud = module => CRUD_ACTIONS.map(({ action }) => `${module}.${action}`)

export const LEGACY_PERMISSION_ALIASES = {
  dashboard: 'dashboard.view', notifications: 'notifications.view', customers: 'customers.view',
  follow_ups: 'follow_ups.view', visit_plans: 'visit_plans.view', calls: 'calls.view',
  reports: 'reports.view', sales_team: 'sales_team.view', settings: 'settings.view',
  user_management: 'users.view', 'vehicles.manage': 'vehicles.update',
  'expenses.budgets.manage': 'expenses.budgets.update', 'fuel.budgets.manage': 'fuel.budgets.update',
}

export const ROLE_DEFAULTS = {
  admin: PERMISSIONS.map(item => item.key),
  manager: [...moduleCrud('dashboard'), ...moduleCrud('customers'), ...moduleCrud('follow_ups'), ...moduleCrud('visit_plans'), 'calls.view', 'reports.view', 'sales_team.view', 'markets.view', 'markets.create', 'markets.update', 'markets.import', 'markets.export', 'notifications.view'],
  sales: ['dashboard.view', ...moduleCrud('customers'), ...moduleCrud('follow_ups'), ...moduleCrud('visit_plans'), 'calls.view', 'calls.create', 'notifications.view'],
  user: ['dashboard.view', 'notifications.view'],
}
