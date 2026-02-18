import React from "react";

export interface Column<T> {
    key: string;
    header: string;
    hideOnMobile?: boolean;
    render: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    rowKey: (item: T) => string;
}

/**
 * A reusable data table component.
 * Supports responsive column hiding via hideOnMobile.
 */
export default function DataTable<T>({
    columns,
    data,
    rowKey,
}: DataTableProps<T>) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-800/50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:px-6 ${col.hideOnMobile ? "hidden sm:table-cell" : ""
                                        }`}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {data.map((item) => (
                            <tr
                                key={rowKey(item)}
                                className="transition-colors hover:bg-slate-800/50"
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={`px-4 py-4 sm:px-6 ${col.hideOnMobile ? "hidden sm:table-cell" : ""
                                            }`}
                                    >
                                        {col.render(item)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
