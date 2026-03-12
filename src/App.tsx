/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import CreateLovedOne from './pages/CreateLovedOne';
import Chat from './pages/Chat';
import Call from './pages/Call';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthReady } = useAuth();
  if (!isAuthReady) return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-500">Loading...</div>;
  return currentUser ? <>{children}</> : <Navigate to="/" />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/create" element={<PrivateRoute><CreateLovedOne /></PrivateRoute>} />
            <Route path="/edit/:id" element={<PrivateRoute><CreateLovedOne /></PrivateRoute>} />
            <Route path="/chat/:id" element={<PrivateRoute><Chat /></PrivateRoute>} />
            <Route path="/call/:id" element={<PrivateRoute><Call /></PrivateRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}
