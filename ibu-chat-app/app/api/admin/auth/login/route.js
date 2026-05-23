import { verifyPassword, createToken } from '../../../../../lib/auth'

export async function POST(req) {
  try {
    const { username, password } = await req.json()
    const expectedUsername = process.env.ADMIN_USERNAME || 'ibu_admin'

    if (username !== expectedUsername) {
      return Response.json(
        { error: 'Kullanıcı adı veya şifre hatalı' },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password)
    if (!isValid) {
      return Response.json(
        { error: 'Kullanıcı adı veya şifre hatalı' },
        { status: 401 }
      )
    }

    const token = await createToken()
    
    // Cookie options
    const cookieName = 'ibu_admin_token'
    const maxAge = 24 * 60 * 60 // 24 hours in seconds
    const cookieString = `${cookieName}=${token}; Path=/; HttpOnly; Max-Age=${maxAge}; SameSite=Strict; Secure`

    return Response.json(
      { success: true },
      {
        status: 200,
        headers: {
          'Set-Cookie': cookieString,
        },
      }
    )
  } catch (err) {
    console.error('Login error:', err)
    return Response.json(
      { error: 'Giriş işlemi sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
