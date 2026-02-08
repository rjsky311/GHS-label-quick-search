export default function SkeletonTable({ rows = 5 }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="skeleton w-20 h-5 rounded" />
          <div className="skeleton w-32 h-4 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton w-24 h-9 rounded-lg" />
          <div className="skeleton w-28 h-9 rounded-lg" />
          <div className="skeleton w-24 h-9 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-slate-900/50">
              {["w-12", "w-12", "w-28", "min-w-[200px]", "w-48", "w-20", "w-24"].map((w, i) => (
                <th key={i} className={`px-4 py-3 ${w}`}>
                  <div className="skeleton w-full h-3 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {Array.from({ length: rows }).map((_, idx) => (
              <tr key={idx} className="hover:bg-slate-700/30">
                {/* Checkbox */}
                <td className="px-2 py-4 text-center">
                  <div className="skeleton w-4 h-4 rounded mx-auto" />
                </td>
                {/* Favorite */}
                <td className="px-2 py-4 text-center">
                  <div className="skeleton w-5 h-5 rounded-full mx-auto" />
                </td>
                {/* CAS */}
                <td className="px-4 py-4">
                  <div className="skeleton w-20 h-5 rounded" />
                </td>
                {/* Name */}
                <td className="px-4 py-4">
                  <div className="skeleton w-48 h-5 rounded mb-2" />
                  <div className="skeleton w-32 h-4 rounded" />
                </td>
                {/* GHS Icons */}
                <td className="px-4 py-4">
                  <div className="flex gap-1">
                    {Array.from({ length: 2 + (idx % 3) }).map((_, j) => (
                      <div key={j} className="skeleton w-10 h-10 rounded" />
                    ))}
                  </div>
                </td>
                {/* Signal Word */}
                <td className="px-4 py-4">
                  <div className="skeleton w-14 h-7 rounded" />
                </td>
                {/* Action */}
                <td className="px-4 py-4">
                  <div className="skeleton w-16 h-8 rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
