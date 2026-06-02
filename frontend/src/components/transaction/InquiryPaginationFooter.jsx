import React from 'react';

const InquiryPaginationFooter = ({ pagination, count, onPageChange }) => {
    const page = Number(pagination?.page || 1);
    const pages = Number(pagination?.pages || 1);
    const total = Number(pagination?.count || 0);

    return (
        <div className="bg-gray-50 px-4 py-3 border-t flex flex-col md:flex-row justify-between items-center mt-2 rounded-lg gap-4">
            <span className="text-xs text-gray-500 font-medium">
                Showing {count} of {total} records (Page {page} of {pages})
            </span>
            <div className="flex flex-wrap justify-center gap-1">
                <button
                    disabled={page <= 1}
                    onClick={() => onPageChange(1)}
                    className="px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-[10px] font-bold uppercase"
                >
                    First
                </button>
                <button
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs font-bold"
                >
                    Prev
                </button>
                {[...Array(pages)].map((_, index) => {
                    const p = index + 1;
                    if (p === 1 || p === pages || (p >= page - 2 && p <= page + 2)) {
                        return (
                            <button
                                key={p}
                                onClick={() => onPageChange(p)}
                                className={`px-3 py-1 border rounded text-xs font-bold transition-all ${page === p ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-110' : 'bg-white hover:bg-gray-100'}`}
                            >
                                {p}
                            </button>
                        );
                    }
                    if (p === page - 3 || p === page + 3) {
                        return <span key={p} className="px-1 text-gray-400">...</span>;
                    }
                    return null;
                })}
                <button
                    disabled={page >= pages}
                    onClick={() => onPageChange(page + 1)}
                    className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-xs font-bold"
                >
                    Next
                </button>
                <button
                    disabled={page >= pages}
                    onClick={() => onPageChange(pages)}
                    className="px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 text-[10px] font-bold uppercase"
                >
                    Last
                </button>
            </div>
        </div>
    );
};

export default InquiryPaginationFooter;
