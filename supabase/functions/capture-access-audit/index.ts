import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AccessAuditData {
  user_id: string
  user_name: string
  user_email: string
  user_role: string
  login_method?: string
  login_success: boolean
  failure_reason?: string
  logout_timestamp?: string
  session_duration_minutes?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get client IP and user agent
    let clientIP = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   req.headers.get('cf-connecting-ip') || 
                   'unknown'
    
    // Handle multiple IPs in x-forwarded-for header (take the first one)
    if (clientIP.includes(',')) {
      clientIP = clientIP.split(',')[0].trim()
    }
    
    const userAgent = req.headers.get('user-agent') || 'unknown'
    
    // Parse user agent to extract device/browser info
    const deviceInfo = parseUserAgent(userAgent)
    
    // Get geolocation data based on IP
    let locationData = null
    try {
      if (clientIP !== 'unknown' && !clientIP.includes('127.0.0.1') && !clientIP.includes('localhost')) {
        const geoResponse = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,regionName,city`)
        if (geoResponse.ok) {
          locationData = await geoResponse.json()
        }
      }
    } catch (error) {
      console.log('Error fetching geolocation:', error)
    }

    const auditData: AccessAuditData = await req.json()

    // Insert access audit log
    const { error } = await supabase
      .from('access_audit_logs')
      .insert({
        user_id: auditData.user_id,
        user_name: auditData.user_name,
        user_email: auditData.user_email,
        user_role: auditData.user_role,
        ip_address: clientIP,
        user_agent: userAgent,
        device_type: deviceInfo.device,
        browser_name: deviceInfo.browser,
        operating_system: deviceInfo.os,
        location_country: locationData?.country || null,
        location_region: locationData?.regionName || null,
        location_city: locationData?.city || null,
        login_method: auditData.login_method || 'email_password',
        login_success: auditData.login_success,
        failure_reason: auditData.failure_reason || null,
        logout_timestamp: auditData.logout_timestamp || null,
        session_duration_minutes: auditData.session_duration_minutes || null,
      })

    if (error) {
      console.error('Error inserting audit log:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to log access audit' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        ip_address: clientIP,
        location: locationData,
        device_info: deviceInfo
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error processing access audit:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function parseUserAgent(userAgent: string) {
  const device = /Mobile|Android|iPhone|iPad/.test(userAgent) 
    ? 'Mobile' 
    : /Tablet/.test(userAgent) 
    ? 'Tablet' 
    : 'Desktop'
  
  let browser = 'Unknown'
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome'
  else if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari'
  else if (userAgent.includes('Edg')) browser = 'Edge'
  else if (userAgent.includes('Opera')) browser = 'Opera'
  
  let os = 'Unknown'
  if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Mac')) os = 'macOS'
  else if (userAgent.includes('Linux')) os = 'Linux'
  else if (userAgent.includes('Android')) os = 'Android'
  else if (userAgent.includes('iOS')) os = 'iOS'
  
  return { device, browser, os }
}