import { useEffect, useMemo, useState } from 'react'
import { Download, Share, Smartphone, X } from 'lucide-react'

export default function InstallAppButton({ compact = false }) {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [open, setOpen] = useState(false)
  const [installed, setInstalled] = useState(false)

  const platform = useMemo(() => {
    const ua = navigator.userAgent || ''
    const iOS = /iphone|ipad|ipod/i.test(ua)
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
    const nativeShell = window.location.protocol === 'capacitor:'
    return { iOS, standalone, nativeShell }
  }, [])

  useEffect(() => {
    const beforeInstall = event => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const appInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', appInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', appInstalled)
    }
  }, [])

  if (installed || platform.standalone || platform.nativeShell) return null

  const install = async () => {
    if (!installPrompt) {
      setOpen(true)
      return
    }
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  return <>
    <button
      type="button"
      onClick={install}
      className={compact ? 'rounded-xl p-2.5 text-blue-600 hover:bg-blue-50' : 'btn-secondary'}
      title="Install App"
    >
      <Download size={compact ? 20 : 17}/>
      {!compact && <span>Install App</span>}
    </button>
    {open && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={event => event.target === event.currentTarget && setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Smartphone size={20}/></span>
            <div>
              <h2 className="font-bold text-slate-900">Install Customer CRM</h2>
              <p className="text-xs text-slate-500">ដាក់ App លើ Home Screen</p>
            </div>
          </div>
          <button className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setOpen(false)} aria-label="បិទ"><X size={18}/></button>
        </div>
        <div className="space-y-4 p-5 text-sm text-slate-700">
          {platform.iOS ? <>
            <p>លើ iPhone សូម install តាម Safari ដូចនេះ៖</p>
            <ol className="space-y-3">
              <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">1</span><span>បើក website នេះក្នុង Safari</span></li>
              <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span><span className="flex items-center gap-1">ចុចប៊ូតុង Share <Share size={16} className="text-blue-600"/></span></li>
              <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">3</span><span>ជ្រើស <b>Add to Home Screen</b></span></li>
              <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">4</span><span>ចុច <b>Add</b></span></li>
            </ol>
          </> : <>
            <p>Browser នេះមិនទាន់បង្ហាញ install prompt ទេ។ សូមបើក menu របស់ browser ហើយជ្រើស <b>Install app</b> ឬ <b>Add to Home screen</b>។</p>
          </>}
        </div>
      </div>
    </div>}
  </>
}
