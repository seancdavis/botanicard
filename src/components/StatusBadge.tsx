const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
  dead: "bg-red-100 text-red-700",
  given_away: "bg-blue-100 text-blue-700",
  sold: "bg-purple-100 text-purple-700",
  broken: "bg-orange-100 text-orange-700",
  seeded: "bg-amber-100 text-amber-800",
  sprouting: "bg-lime-100 text-lime-800",
  growing: "bg-green-100 text-green-800",
  transplanted: "bg-teal-100 text-teal-800",
  producing: "bg-emerald-100 text-emerald-800",
  harvested: "bg-yellow-100 text-yellow-800",
};

export function StatusBadge({ status }: { status: string }) {
  const colors = statusColors[status] || "bg-gray-100 text-gray-600";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors}`}
    >
      {label}
    </span>
  );
}
