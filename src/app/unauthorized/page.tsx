import { SignOutButton } from '@clerk/nextjs'

export default function UnauthorizedPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#ebebeb', fontFamily: "'DM Mono', monospace",
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: '0.1em', color: '#1a1a1a', marginBottom: 12 }}>
          ACCESS RESTRICTED
        </div>
        <p style={{ fontSize: 12, color: '#8a7e78', marginBottom: 24, lineHeight: 1.7 }}>
          This application is only available to ENSO team members.<br />
          Sign in with your ENSO or Playground Logic account.
        </p>
        <SignOutButton redirectUrl="/sign-in">
          <button style={{
            background: '#1a1a1a', color: '#fff', border: 'none', padding: '10px 24px',
            fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.16em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
            Sign Out
          </button>
        </SignOutButton>
      </div>
    </div>
  )
}
