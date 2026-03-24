import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

const ALLOWED_DOMAINS = ['playgroundlogic.co', 'enso.co']

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()

  if (user) {
    const email = user.primaryEmailAddress?.emailAddress ?? ''
    const allowed = ALLOWED_DOMAINS.some(d => email.endsWith(`@${d}`))
    if (!allowed) {
      redirect('/unauthorized')
    }
  }

  return <>{children}</>
}
