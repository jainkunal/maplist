'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const listId = searchParams.get('listId');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
          <p className="text-slate-500">
            You now have full access to this list. Enjoy exploring all the curated places!
          </p>
        </div>

        {listId && (
          <Link
            href={`/p/${listId}`}
            className="inline-flex items-center justify-center w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-blue-600/20"
          >
            View Your List
          </Link>
        )}

        <Link
          href="/explore"
          className="inline-block text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Back to Explore
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
