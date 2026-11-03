import React from 'react';
import { AlertCircle, LoaderCircle, ServerOff } from 'lucide-react';

export function LoadingState({ label = 'Loading data...' }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white p-8 text-sm font-medium text-gray-500">
      <LoaderCircle className="h-4 w-4 animate-spin text-lime-700" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Unable to load data</p>
        <p className="mt-1">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 font-semibold underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children = 'No records found.' }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}

export function UnavailableNotice({ module, detail }) {
  return (
    <div role="status" className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
      <div className="flex items-start gap-3">
        <ServerOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <h3 className="font-bold">{module} is not available from the live backend</h3>
          <p className="mt-1 text-sm text-amber-900">
            {detail || 'The existing Spring Boot API does not expose an endpoint for this module yet. No demo records or actions are shown in live mode.'}
          </p>
        </div>
      </div>
    </div>
  );
}
