import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import Navbar from '../components/Navbar.jsx';

import Login        from '../pages/Login.jsx';
import Signup       from '../pages/Signup.jsx';
import Dashboard    from '../pages/Dashboard.jsx';
import Upload       from '../pages/Upload.jsx';
import BatchDetails from '../pages/BatchDetails.jsx';
import Uncategorized from '../pages/Uncategorized.jsx';
import Dictionary   from '../pages/Dictionary.jsx';

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
          } />
          <Route path="/upload" element={
            <ProtectedRoute><Layout><Upload /></Layout></ProtectedRoute>
          } />
          <Route path="/batches/:id" element={
            <ProtectedRoute><Layout><BatchDetails /></Layout></ProtectedRoute>
          } />
          <Route path="/uncategorized" element={
            <ProtectedRoute><Layout><Uncategorized /></Layout></ProtectedRoute>
          } />
          <Route path="/dictionary" element={
            <ProtectedRoute><Layout><Dictionary /></Layout></ProtectedRoute>
          } />

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
