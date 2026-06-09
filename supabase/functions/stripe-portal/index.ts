import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY not configured')
    return new Response(JSON.stringify({ error: 'Payment system not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  })

  try {
    const body = await req.json()
    const { customer_id, session_id, returnUrl } = body

    if (!customer_id && !session_id) {
      return new Response(JSON.stringify({ error: 'customer_id or session_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let customerId: string

    if (customer_id) {
      customerId = customer_id
    } else {
      const checkoutSession = await stripe.checkout.sessions.retrieve(session_id)
      if (!checkoutSession.customer) {
        return new Response(JSON.stringify({ error: 'No customer found for session' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      customerId = typeof checkoutSession.customer === 'string'
        ? checkoutSession.customer
        : checkoutSession.customer.id
    }

    const origin = req.headers.get('origin') || req.headers.get('referer') || 'http://localhost:5173'
    const return_url = returnUrl || `${origin}/settings/billing`

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url,
    })

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Stripe portal error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
