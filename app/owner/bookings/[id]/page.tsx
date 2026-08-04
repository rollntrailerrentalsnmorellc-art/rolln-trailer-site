import Link from "next/link";

export default async function BookingDetailsPage() {
  return (
    <main>
      <section className="container">
        <Link href="/owner/bookings" className="btn">
          ← Back to Bookings
        </Link>

        <div className="panel" style={{ marginTop: 20 }}>
          <h1>Booking Details</h1>
          <p className="muted">
            This page will display all information for an individual booking.
          </p>

          <hr style={{ margin: "20px 0" }} />

          <h3>Customer</h3>
          <p>Name: —</p>
          <p>Email: —</p>
          <p>Phone: —</p>

          <hr style={{ margin: "20px 0" }} />

          <h3>Rental</h3>
          <p>Trailer: —</p>
          <p>Status: Pending</p>
          <p>Pickup: —</p>
          <p>Return: —</p>

          <hr style={{ margin: "20px 0" }} />

          <h3>Payment</h3>
          <p>Deposit: —</p>
          <p>Balance Due: —</p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 24,
            }}
          >
            <button className="btn">Approve</button>
            <button className="btn">Decline</button>
            <button className="btn">Mark Picked Up</button>
            <button className="btn">Mark Returned</button>
          </div>
        </div>
      </section>
    </main>
  );
}