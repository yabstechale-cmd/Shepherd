import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lsaledmvjbfptufhemsp.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Pqj_z7ou5Ep3Zxd8TUBdPg_TzJPCgud'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
