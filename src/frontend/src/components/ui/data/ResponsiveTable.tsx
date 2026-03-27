import React from "react";

export interface Column<T> {
  key: string;
  label: string;
  mobileLabel?: string;
  hideOnMobile?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
  renderActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  renderMobileCard,
  renderActions,
  onRowClick,
  emptyMessage = "No data found",
  className = "",
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <span className="material-symbols-outlined text-4xl mb-2 block">
          inbox
        </span>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const getCellValue = (row: T, col: Column<T>): React.ReactNode => {
    if (col.render) return col.render(row);
    return (row as Record<string, unknown>)[col.key] as React.ReactNode;
  };

  return (
    <div className={className}>
      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {data.map((row, index) => {
          if (renderMobileCard) {
            return (
              <div
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {renderMobileCard(row, index)}
              </div>
            );
          }

          // Default mobile card
          return (
            <div
              key={keyExtractor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`bg-white/5 rounded-xl p-4 border border-white/5 ${
                onRowClick
                  ? "cursor-pointer hover:bg-white/10 active:bg-white/15 transition-colors"
                  : ""
              }`}
            >
              {columns
                .filter((col) => !col.hideOnMobile)
                .map((col) => (
                  <div
                    key={col.key}
                    className="flex justify-between items-center py-1"
                  >
                    <span className="text-sm text-slate-400">
                      {col.mobileLabel || col.label}
                    </span>
                    <span className="text-sm text-white">
                      {getCellValue(row, col)}
                    </span>
                  </div>
                ))}
              {renderActions && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  {renderActions(row)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 ${col.className || ""}`}
                >
                  {col.label}
                </th>
              ))}
              {renderActions && (
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${
                  onRowClick
                    ? "cursor-pointer hover:bg-white/5 transition-colors"
                    : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-white ${col.className || ""}`}
                  >
                    {getCellValue(row, col)}
                  </td>
                ))}
                {renderActions && (
                  <td className="px-4 py-3 text-right">
                    {renderActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResponsiveTable;
