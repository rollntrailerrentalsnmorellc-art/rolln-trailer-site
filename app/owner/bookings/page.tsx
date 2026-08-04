export default function BookingsPage() {
  return (
    <main className="container">
      <h1>Bookings</h1>

      <p className="muted">
        View, approve, deny, and manage trailer bookings.
      </p>

      <div className="panel" style={{ marginTop: 24 }}>
        <h2>No bookings yet</h2>

        <p className="muted">
          Customer reservations will appear here.
        </p>
      </div>
    </main>
  );
}