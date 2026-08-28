import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import { LocaleProvider, useLocale } from "./hooks/useLocale.jsx";
import { Layout } from "./components/Layout.jsx";
import { Login } from "./pages/Login.jsx";
import { ResetPassword } from "./pages/ResetPassword.jsx";
import { Home } from "./pages/Home.jsx";
import { ClosedOrders } from "./pages/ClosedOrders.jsx";
import { UnplacedOrders } from "./pages/UnplacedOrders.jsx";
import { CanceledOrders } from "./pages/CanceledOrders.jsx";
import { MyItems } from "./pages/MyItems.jsx";
import { MyStatistics } from "./pages/MyStatistics.jsx";
import { Session } from "./pages/Session.jsx";
import { Settings } from "./pages/Settings.jsx";
import { AdminUsers } from "./pages/AdminUsers.jsx";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  if (loading) return <p className="muted center page">{t("common.loading")}</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/closed" element={<ClosedOrders />} />
        <Route path="/unplaced" element={<UnplacedOrders />} />
        <Route path="/canceled" element={<CanceledOrders />} />
        <Route path="/my-items" element={<MyItems />} />
        <Route path="/my-statistics" element={<MyStatistics />} />
        <Route path="/session/:id" element={<Session />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </LocaleProvider>
  );
}
