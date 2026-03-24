import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#ebebeb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Mono', monospace",
      }}
    >
      <SignIn />
    </div>
  )
}
