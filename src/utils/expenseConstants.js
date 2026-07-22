export const EXPENSE_STATUSES = [
  ['draft','ព្រាង'],['submitted','បានដាក់ស្នើ'],['under_review','កំពុងពិនិត្យ'],['returned','ត្រឡប់ឱ្យកែ'],['approved','បានអនុម័ត'],
  ['rejected','បានបដិសេធ'],['payment_processing','កំពុងទូទាត់'],['paid','បានទូទាត់'],['completed','បានបញ្ចប់'],['cancelled','បានបោះបង់'],
]

export const EXPENSE_STATUS_COLORS = {
  draft:'bg-slate-100 text-slate-700',submitted:'bg-blue-100 text-blue-700',under_review:'bg-amber-100 text-amber-700',returned:'bg-orange-100 text-orange-700',
  approved:'bg-emerald-100 text-emerald-700',rejected:'bg-red-100 text-red-700',payment_processing:'bg-violet-100 text-violet-700',paid:'bg-cyan-100 text-cyan-700',completed:'bg-green-100 text-green-700',cancelled:'bg-slate-200 text-slate-600',
}

export const PAYMENT_METHODS = [['cash','សាច់ប្រាក់'],['bank_transfer','ផ្ទេរធនាគារ'],['cheque','មូលប្បទានប័ត្រ'],['advance_payment','បុរេប្រទាន'],['reimbursement','ទូទាត់សង']]
export const DOCUMENT_TYPES = [['invoice','វិក្កយបត្រ'],['receipt','បង្កាន់ដៃ'],['mission_letter','លិខិតបេសកកម្ម'],['participant_list','បញ្ជីអ្នកចូលរួម'],['activity_photo','រូបភាពសកម្មភាព'],['completion_report','របាយការណ៍បញ្ចប់'],['payment_proof','ភស្តុតាងទូទាត់'],['other','ផ្សេងៗ']]
export const expenseStatusLabel = status => EXPENSE_STATUSES.find(([value]) => value === status)?.[1] || status
export const money = value => new Intl.NumberFormat('km-KH',{style:'currency',currency:'USD'}).format(Number(value || 0))
