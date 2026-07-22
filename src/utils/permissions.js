export const PERMISSIONS = [
  { key: 'dashboard', label: 'ផ្ទាំងគ្រប់គ្រង', group: 'ទូទៅ' },
  { key: 'notifications', label: 'ការជូនដំណឹង', group: 'ទូទៅ' },
  { key: 'customers', label: 'គ្រប់គ្រងអតិថិជន', group: 'ការងារលក់' },
  { key: 'follow_ups', label: 'Follow Up', group: 'ការងារលក់' },
  { key: 'visit_plans', label: 'ផែនការចុះស្រុក', group: 'ការងារលក់' },
  { key: 'calls', label: 'ប្រវត្តិការហៅ', group: 'ការងារលក់' },
  { key: 'reports', label: 'របាយការណ៍', group: 'ការគ្រប់គ្រង' },
  { key: 'sales_team', label: 'មើលក្រុមលក់', group: 'ការគ្រប់គ្រង' },
  { key: 'markets.view', label: 'មើលព័ត៌មានផ្សារ', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'markets.create', label: 'បង្កើតផ្សារ', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'markets.update', label: 'កែប្រែផ្សារ និងតូប', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'markets.delete', label: 'លុបផ្សារ', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'markets.restore', label: 'Restore ផ្សារ', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'markets.import', label: 'Import ទិន្នន័យផ្សារ', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'markets.export', label: 'Export ទិន្នន័យផ្សារ', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'markets.view_audit', label: 'មើល Audit Log ផ្សារ', group: 'គ្រប់គ្រងផ្សារ' },
  { key: 'settings', label: 'ការកំណត់', group: 'ប្រព័ន្ធ' },
  { key: 'user_management', label: 'គ្រប់គ្រងអ្នកប្រើប្រាស់', group: 'ប្រព័ន្ធ' },
]

export const ROLE_DEFAULTS = {
  admin: PERMISSIONS.map(item => item.key),
  manager: ['dashboard', 'customers', 'follow_ups', 'visit_plans', 'calls', 'reports', 'sales_team', 'markets.view', 'markets.create', 'markets.update', 'markets.import', 'markets.export', 'notifications'],
  sales: ['dashboard', 'customers', 'follow_ups', 'visit_plans', 'calls', 'notifications'],
  user: ['dashboard', 'notifications'],
}
