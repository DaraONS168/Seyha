import { useState } from 'react'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import { marketImportExport } from '../../utils/marketImportExport'
import { marketService } from '../../services/marketService'

export default function MarketImportDialog({ open, onClose, onImported }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [fileName, setFileName] = useState('')
  const reset = () => { setRows([]); setProgress(''); setFileName(''); onClose() }
  const chooseFile = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setLoading(true)
    try { setRows(await marketImportExport.parseImport(file)) } catch (error) { toast.error(error.message) }
    setLoading(false)
  }
  const runImport = async () => {
    setLoading(true)
    const results = await marketImportExport.importRows(rows, (current,total) => setProgress(`${current}/${total}`))
    const failed = results.filter(row => row.error)
    await marketService.logImport({ file_name: fileName || 'market-import.xlsx', total_rows: rows.length, imported_rows: results.length - failed.length, failed_rows: failed.length + rows.filter(row => !row.valid).length, error_details: [...rows.filter(row => !row.valid).map(row => ({ row: row.row, errors: row.errors })), ...failed.map(row => ({ row: row.row, errors: [row.error] }))] })
    setLoading(false)
    if (failed.length) toast.error(`Import បាន ${results.length - failed.length}, បរាជ័យ ${failed.length}`)
    else toast.success(`Import បានជោគជ័យ ${results.length} ផ្សារ`)
    onImported(); reset()
  }
  const valid = rows.filter(row => row.valid).length
  return <Modal open={open} onClose={reset} title="Import ទិន្នន័យផ្សារពី Excel" size="max-w-4xl"><div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 p-4"><div><p className="font-semibold text-blue-900">ប្រើ Excel Template របស់ប្រព័ន្ធ</p><p className="mt-1 text-xs text-blue-700">បំពេញ Code របស់ទីតាំង និងរក្សា column headers ដដែល។</p></div><button className="btn-secondary" onClick={() => marketImportExport.downloadTemplate()}><Download size={17}/>ទាញយក Template</button></div><label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-8 text-center hover:bg-slate-50"><FileSpreadsheet size={36} className="text-green-600"/><span className="mt-2 font-semibold">ជ្រើស Excel File</span><span className="mt-1 text-xs text-slate-500">.xlsx ឬ .xls</span><input className="hidden" type="file" accept=".xlsx,.xls" onChange={chooseFile}/></label>{loading && !rows.length && <p className="text-center text-sm text-slate-500">កំពុងពិនិត្យ File...</p>}{rows.length > 0 && <><div className="flex gap-4 text-sm"><span className="font-semibold text-green-600">ត្រឹមត្រូវ {valid}</span><span className="font-semibold text-red-600">មានបញ្ហា {rows.length - valid}</span></div><div className="max-h-72 overflow-auto rounded-xl border"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-left"><tr><th className="table-cell">Row</th><th className="table-cell">ឈ្មោះផ្សារ</th><th className="table-cell">ស្ថានភាព</th><th className="table-cell">បញ្ហា</th></tr></thead><tbody className="divide-y">{rows.map(row => <tr key={row.row}><td className="table-cell">{row.row}</td><td className="table-cell">{row.payload.name_kh || '—'}</td><td className="table-cell"><span className={row.valid ? 'text-green-600' : 'text-red-600'}>{row.valid ? 'ត្រឹមត្រូវ' : 'មិនត្រឹមត្រូវ'}</span></td><td className="table-cell text-xs text-red-600">{row.errors.join(' · ') || '—'}</td></tr>)}</tbody></table></div></>}<div className="flex justify-end gap-3 border-t pt-4"><button className="btn-secondary" onClick={reset}>បោះបង់</button><button className="btn-primary" disabled={loading || valid === 0} onClick={runImport}><Upload size={17}/>{loading ? `កំពុង Import ${progress}` : `Import ${valid} ផ្សារ`}</button></div></div></Modal>
}
