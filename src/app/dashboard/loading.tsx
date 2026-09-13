import React from 'react'

export default function Loading() {
    return (
        <div className="animate-in fade-in duration-500 space-y-10">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-2 flex-1 w-full">
                    <div className="h-8 bg-slate-200 rounded-xl w-48 animate-pulse"></div>
                    <div className="h-4 bg-slate-100 rounded-lg w-64 animate-pulse"></div>
                </div>
                <div className="h-10 bg-slate-200 rounded-xl w-32 animate-pulse hidden sm:block"></div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-white border border-slate-100 rounded-2xl p-6 space-y-3 shadow-sm">
                        <div className="h-4 bg-slate-100 rounded-lg w-20 animate-pulse"></div>
                        <div className="h-8 bg-slate-200 rounded-xl w-32 animate-pulse"></div>
                    </div>
                ))}
            </div>

            {/* Table/List Skeleton */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="h-16 bg-slate-50 border-b border-slate-100 px-8 flex items-center justify-between">
                    <div className="h-4 bg-slate-200 rounded-lg w-32 animate-pulse"></div>
                    <div className="flex gap-2">
                        <div className="h-8 bg-slate-200 rounded-lg w-24 animate-pulse"></div>
                        <div className="h-8 bg-slate-200 rounded-lg w-24 animate-pulse"></div>
                    </div>
                </div>
                <div className="p-8 space-y-6">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="h-12 w-12 bg-slate-100 rounded-xl animate-pulse"></div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-slate-200 rounded-lg w-40 animate-pulse"></div>
                                    <div className="h-3 bg-slate-100 rounded-lg w-24 animate-pulse"></div>
                                </div>
                            </div>
                            <div className="h-4 bg-slate-200 rounded-lg w-20 animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
