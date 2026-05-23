import { redirect } from 'next/navigation'

export default function Home() {
  // Automatically redirect home visitors to the admin dashboard
  redirect('/admin/knowledge')
}
