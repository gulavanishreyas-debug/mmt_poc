'use client';

import { useState } from 'react';

export default function DebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCreateTrip = async () => {
    setLoading(true);
    setResult(null);
    
    console.log('🧪 [Debug] Testing trip creation...');
    
    try {
      const testData = {
        tripName: 'Debug Test Trip',
        destination: 'Test Destination',
        purpose: 'casual',
        requiredMembers: 3,
        adminName: 'Debug Admin',
      };
      
      console.log('🧪 [Debug] Sending request:', testData);
      
      const response = await fetch('/api/social-cart/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });
      
      console.log('🧪 [Debug] Response status:', response.status);
      
      const data = await response.json();
      console.log('🧪 [Debug] Response data:', data);
      
      setResult({
        success: response.ok,
        status: response.status,
        data,
      });
    } catch (error: any) {
      console.error('🧪 [Debug] Error:', error);
      setResult({
        success: false,
        error: error.message,
        stack: error.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test API Endpoints</h2>
          
          <button
            onClick={testCreateTrip}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Create Trip API'}
          </button>
        </div>
        
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Result</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Open browser DevTools (F12)</li>
            <li>Go to Console tab</li>
            <li>Click "Test Create Trip API" button</li>
            <li>Check console for detailed logs</li>
            <li>Check result box below for response</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
