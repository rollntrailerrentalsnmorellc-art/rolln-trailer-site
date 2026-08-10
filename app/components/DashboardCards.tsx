type DashboardCardsProps = {
  activeTrailers: number
  pendingBookings: number
  activeRentals: number
  pickupsToday: number
  returnsToday: number
  revenueMonth?: number
}

export default function DashboardCards({
  activeTrailers,
  pendingBookings,
  activeRentals,
  pickupsToday,
  returnsToday,
  revenueMonth = 0,
}: DashboardCardsProps) {
  const cards = [
    {
      title: "Active Trailers",
      value: activeTrailers,
      color: "#7DFB00",
    },
    {
      title: "Pending Bookings",
      value: pendingBookings,
      color: "#f59e0b",
    },
    {
      title: "Active Rentals",
      value: activeRentals,
      color: "#2563eb",
    },
    {
      title: "Today's Pickups",
      value: pickupsToday,
      color: "#7c3aed",
    },
    {
      title: "Today's Returns",
      value: returnsToday,
      color: "#dc2626",
    },
    {
      title: "Revenue This Month",
      value: `$${revenueMonth.toLocaleString()}`,
      color: "#059669",
    },
  ]

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
        gap: "16px",
        marginBottom: "24px",
      }}
    >
      {cards.map((card) => (
        <div
          key={card.title}
          style={{
            background: "#111827",
            borderRadius: "14px",
            padding: "22px",
            borderTop: `5px solid ${card.color}`,
            boxShadow: "0 8px 20px rgba(0,0,0,.25)",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "#9ca3af",
              marginBottom: "10px",
            }}
          >
            {card.title}
          </div>

          <div
            style={{
              fontSize: "34px",
              fontWeight: 700,
            }}
          >
            {card.value}
          </div>
        </div>
      ))}
    </div>
  )
}