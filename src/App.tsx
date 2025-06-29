import React from 'react';
import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/home";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import ListingsPage from "./components/listings/ListingsPage";
import ListingDetail from "./components/listings/ListingDetail";
import CreateListing from "./components/listings/CreateListing";
import Favorites from "./components/favorites/Favorites";
import Inbox from "./components/inbox/Inbox";
import MyListings from "./components/listings/MyListings";
import TradeHistory from "./components/trades/TradeHistory";
import UserProfile from "./components/profile/UserProfile";
import UserRating from "./components/rating/UserRating";
import AdminPanel from "./components/admin/AdminPanel";
import AdminMediationChannel from "./components/admin/AdminMediationChannel";
import Layout from "./components/layout/Layout";
import { Toaster } from "./components/ui/toaster";
import { useAuth } from "./contexts/AuthContext";
// Remove this line as it's not needed
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tabadol-purple"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tabadol-purple"></div>
          </div>
        }
      >
        <>
          <Routes>
            <Route
              path="/"
              element={
                <Layout>
                  <Home />
                </Layout>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/listings"
              element={
                <Layout>
                  <ListingsPage />
                </Layout>
              }
            />
            <Route
              path="/listing/:id"
              element={
                <Layout>
                  <ListingDetail />
                </Layout>
              }
            />
            <Route
              path="/create-listing"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateListing />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-listing/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreateListing />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Favorites />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inbox"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Inbox />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-listings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MyListings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/trade-history"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TradeHistory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UserProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:id"
              element={
                <Layout>
                  <UserProfile />
                </Layout>
              }
            />
            <Route
              path="/rate-user/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UserRating />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AdminPanel />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/mediation"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AdminMediationChannel />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster />
        </>
      </Suspense>
    </I18nextProvider>
  );
}

export default App;
