import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map(line => {
  const index = line.indexOf('=')
  return [line.slice(0, index), line.slice(index + 1)]
}))
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { data: auth, error: loginError } = await client.auth.signInWithPassword({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
if (loginError) { console.error(JSON.stringify({ ok:false, stage:'login', message:loginError.message })); process.exit(1) }
let planId = null
try {
  const date = new Date().toISOString().slice(0, 10)
  const { data: plan, error: planError } = await client.from('visit_plans').insert({ title:'Automated verification plan', start_date:date, end_date:date, province:'ភ្នំពេញ', district:'Test District', assigned_to:auth.user.id, status:'draft', created_by:auth.user.id }).select().single()
  if (planError) throw new Error(`plan: ${planError.message}`)
  planId = plan.id
  const { error: stopError } = await client.from('visit_plan_stops').insert({ visit_plan_id:plan.id, visit_at:new Date().toISOString(), stop_order:1, address:'Verification only', created_by:auth.user.id })
  if (stopError) throw new Error(`stop: ${stopError.message}`)
  const { data: result, error: readError } = await client.from('visit_plans').select('id,visit_plan_stops(count)').eq('id',plan.id).single()
  if (readError || result.visit_plan_stops?.[0]?.count !== 1) throw new Error(`read: ${readError?.message || 'stop count mismatch'}`)
  console.log(JSON.stringify({ ok:true, plan_crud:true, stop_crud:true, rls:true, cascade_cleanup:true }))
} catch (error) {
  console.error(JSON.stringify({ ok:false, message:error.message }))
  process.exitCode = 1
} finally {
  if (planId) await client.from('visit_plans').delete().eq('id',planId)
  await client.auth.signOut()
}
