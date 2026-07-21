export const PERMISSIONS = [
  { key: 'dashboard', label: 'ផ្ទាំងគ្រប់គ្រង' },
  { key: 'customers', label: 'គ្រប់គ្រងអតិថិជន' },
  { key: 'follow_ups', label: 'Follow Up' },
  { key: 'visit_plans', label: 'ផែនការចុះស្រុក' },
  { key: 'calls', label: 'ប្រវត្តិការហៅ' },
  { key: 'reports', label: 'របាយការណ៍' },
  { key: 'sales_team', label: 'មើលក្រុមលក់' },
  { key: 'notifications', label: 'ការជូនដំណឹង' },
  { key: 'settings', label: 'ការកំណត់' },
  { key: 'user_management', label: 'គ្រប់គ្រងអ្នកប្រើប្រាស់' },
]

export const ROLE_DEFAULTS = {
  admin: PERMISSIONS.map(item => item.key),
  manager: ['dashboard', 'customers', 'follow_ups', 'visit_plans', 'calls', 'reports', 'sales_team', 'notifications'],
  sales: ['dashboard', 'customers', 'follow_ups', 'visit_plans', 'calls', 'notifications'],
}
