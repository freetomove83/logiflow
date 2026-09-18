/** Operational Blueprint app shell: light, information-dense logistics operations console. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AccountLoginPage from "./pages/AccountLogin";
import AccountRecoveryPage from "./pages/AccountRecovery";
import AccountSetupPage from "./pages/AccountSetup";
import StaffInvitePage from "./pages/StaffInvite";
import AgencyPermissionsPage from "./pages/AgencyPermissions";
import { OrganizationRouteGate } from "./components/OrganizationRouteGate";
import { AgencyInvitePage, AgencySignupPage, LandingPage, ShipperJoinPage } from "./pages/Onboarding";

function AgencyInviteRoute() {
  return <OrganizationRouteGate expected="agency"><AgencyInvitePage /></OrganizationRouteGate>;
}

function StaffInviteRoute() {
  const expected = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("role") === "shipper" ? "shipper" : "agency";
  return <OrganizationRouteGate expected={expected}><StaffInvitePage /></OrganizationRouteGate>;
}

function AgencyPermissionsRoute() {
  return <OrganizationRouteGate expected="agency"><AgencyPermissionsPage /></OrganizationRouteGate>;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return <Switch><Route path="/" component={LandingPage} /><Route path="/login" component={AccountLoginPage} /><Route path="/account-recovery" component={AccountRecoveryPage} /><Route path="/account-setup" component={AccountSetupPage} /><Route path="/staff-invite" component={StaffInviteRoute} /><Route path="/agency/permissions" component={AgencyPermissionsRoute} /><Route path="/agency-signup" component={AgencySignupPage} /><Route path="/agency/invites" component={AgencyInviteRoute} /><Route path="/join/:token" component={ShipperJoinPage} /><Route path="/console" component={Home} /><Route path="/404" component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
