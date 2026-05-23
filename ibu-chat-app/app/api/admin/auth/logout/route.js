export async function POST() {
  // Clear cookie by setting expiration in the past
  const cookieString = 'ibu_admin_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict; Secure'
  
  return Response.json(
    { success: true },
    {
      status: 200,
      headers: {
        'Set-Cookie': cookieString,
      },
    }
  )
}

export async function GET() {
  // Clear cookie and redirect to login
  const cookieString = 'ibu_admin_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict; Secure'
  
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': cookieString,
      'Location': '/admin/login',
    },
  })
}
