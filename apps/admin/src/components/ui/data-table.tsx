import type React from 'react';

type DataTableColumn = {
  header: string;
  className?: string;
};

type DataTableProps = {
  columns: DataTableColumn[];
  children: React.ReactNode;
  className?: string;
};

export function DataTable({ columns, children, className }: DataTableProps): React.JSX.Element {
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className ?? ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 ${column.className ?? ''}`}
                  key={column.header}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
