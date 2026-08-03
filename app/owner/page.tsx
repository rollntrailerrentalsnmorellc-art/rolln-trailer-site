import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DashboardCards from '../components/DashboardCards'

export const revalidate = 0

export default async function Owner() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main>
        <section>
          <div className="container">
            <div className="form">
              <h1>Owner dashboard</h1>
              <p className="muted">Sign in with the owner email to continue.</p>
              <Link className="btn" href="/login">
                Secure Sign-In
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'staff'].includes(profile.role)) {
    return (
      <main>
        <section>
          <div className="container">
            <div className="notice">
              This account does not have owner access.
            </div>
          </div>
        </section>
      </main>
    )
  }

  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const [
    pendingResult,
    activeResult,
    trailerResult,
    pickupResult,
    returnResult,
    maintenanceResult,
    documentResult,
    paymentResult,
    recentBookingsResult,
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending_documents', 'pending_payment']),

    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),

    supabase
      .from('trailers')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'inactive'),

    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('pickup_at', startOfDay.toISOString())
      .lte('pickup_at', endOfDay.toISOString()),

    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('return_at', startOfDay.toISOString())
      .lte('return_at', endOfDay.toISOString()),

    supabase
      .from('maintenance')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('payments')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('bookings')
      .select(
        'id, confirmation_code, status, pickup_at, return_at, trailer_id'
      )
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const recentBookings = recentBookingsResult.data ?? []

  function formatDate(value: string | null) {
    if (!value) return 'Not scheduled'

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  }

  return (
    <main>
      <section>
        <div className="container">
          <span className="eyebrow">Private owner area</span>
          <h1>Business command center</h1>
          <p className="muted">
            Manage bookings, fleet availability, customers, payments,
            documents, and maintenance.
          </p>

          <div className="portal-grid" style={{ marginTop: 24 }}>
            <div className="panel">
              <p className="muted">Active trailers</p>
              <h2>{trailerResult.count ?? 0}</h2>
            </div>

            <div className="panel">
              <p className="muted">Pending bookings</p>
              <h2>{pendingResult.count ?? 0}</h2>
            </div>

            <div className="panel">
              <p className="muted">Currently rented</p>
              <h2>{activeResult.count ?? 0}</h2>
            </div>

            <div className="panel">
              <p className="muted">Today’s pickups</p>
              <h2>{pickupResult.count ?? 0}</h2>
            </div>

            <div className="panel">
              <p className="muted">Today’s returns</p>
              <h2>{returnResult.count ?? 0}</h2>
            </div>

            <div className="panel">
              <p className="muted">Maintenance records</p>
              <h2>{maintenanceResult.count ?? 0}</h2>
            </div>

            <div className="panel">
              <p className="muted">Customer documents</p>
              <h2>{documentResult.count ?? 0}</h2>
            </div>

            <div className="panel">
              <p className="muted">Payment records</p>
              <h2>{paymentResult.count ?? 0}</h2>
            </div>
          </div>

          <div
            className="panel"
            style={{ marginTop: 24, overflowX: 'auto' }}
          >
            <h2>Recent bookings</h2>

            {recentBookings.length === 0 ? (
              <p className="muted">No bookings have been created yet.</p>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 700,
                }}
              >
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: 12 }}>Confirmation</th>
                    <th style={{ padding: 12 }}>Status</th>
                    <th style={{ padding: 12 }}>Pickup</th>
                    <th style={{ padding: 12 }}>Return</th>
                  </tr>
                </thead>

                <tbody>
                  {recentBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      style={{ borderTop: '1px solid rgba(255,255,255,.12)' }}
                    >
                      <td style={{ padding: 12 }}>
                        {booking.confirmation_code ?? booking.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: 12 }}>
                        {String(booking.status).replaceAll('_', ' ')}
                      </td>
                      <td style={{ padding: 12 }}>
                        {formatDate(booking.pickup_at)}
                      </td>
                      <td style={{ padding: 12 }}>
                        {formatDate(booking.return_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="portal-grid" style={{ marginTop: 24 }}>
            <Link className="panel" href="/owner/bookings">
              <h2>Bookings</h2>
              <p className="muted">Approvals, pickups, returns, and scheduling</p>
            </Link>

            <Link className="panel" href="/owner/fleet">
              <h2>Fleet</h2>
              <p className="muted">Trailer status, availability, and maintenance</p>
            </Link>

            <Link className="panel" href="/owner/customers">
              <h2>Customers</h2>
              <p className="muted">Profiles, rental history, and documents</p>
            </Link>

            <Link className="panel" href="/owner/payments">
              <h2>Payments</h2>
              <p className="muted">Deposits, balances, charges, and refunds</p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}